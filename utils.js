'use strict';

let term;

async function setTerm() {
    if (term) return;
    const url = "https://enroll.wisc.edu/api/search/v1/terms";
    term = await fetch(url).then(res => res.json())
        .then(e => Math.max(...e.map(e => e.termCode))).catch(handleError);
}

async function searchCourse(query) {
    const data = {
        "queryString": query,
        "selectedTerm": term,
        "sortOrder": "SCORE",
        "page": 1,
        "pageSize": 10
    };

    const options = {
        method: "POST",
        headers: {"Content-Type": "application/json;charset=UTF-8"},
        body: JSON.stringify(data)
    };

    const url = "https://enroll.wisc.edu/api/search/v1";

    return await fetch(url, options).then(res => res.json()).catch(handleError)
}

async function getCourseList() {
    const result = await new Promise(f => chrome.storage.local.get(["courseList"], f));
    return result.courseList ? result.courseList : [];
}

async function setCourseList(courseList) {
    return await new Promise(f => chrome.storage.local.set({courseList}, f))
}

async function removeFromCourseList(courseID) {
    const courseList = await getCourseList();
    await setCourseList(courseList.filter(e => e.id !== courseID));
}

async function addToCourseList(courseID) {
    const courseMeta = {alarm: false, id: courseID};
    const courseList = await getCourseList();
    if (courseList.filter(e => e.id === courseID).length !== 0) return;
    await setCourseList(courseList.concat(courseMeta));
    return await loadCourse(courseMeta);
}

async function modifyCourseListByCourseID(courseID, f) {
    const courseList = await getCourseList();
    const elem = courseList.find(e => e.id === courseID);
    f(elem);
    await setCourseList(courseList);
    return elem;
}

async function loadCourse(courseMeta) {
    const url = `https://enroll.wisc.edu/api/search/v1/enrollmentPackages/${term}/${courseMeta.id.replace("-", "/")}`;
    return await fetch(url).then(res => res.json())
        .then(list => ({list, ...courseMeta})).catch(handleError)
}


async function getSavedCourseData() {
    return (await new Promise(f => chrome.storage.local.get(["courseData"], f))).courseData;
}

async function loadAllCourses() {
    let courseData;
    try {
        await setTerm();
        const courseList = await getCourseList();
        courseData = await Promise.all(courseList.map(loadCourse));
        await checkDifference(courseData);
        await new Promise(f => chrome.storage.local.set({courseData}, f));
    } catch (e) {
        courseData = await getSavedCourseData();
    }
    return courseData;
}

async function checkDifference(newData) {
    const oldData = await getSavedCourseData();
    if (!oldData || !newData) return;

    newData.filter(e => e.alarm).forEach(newCourse => {
        const oldCourse = oldData.find(e => e.id === newCourse.id);
        checkCourseDifference(newCourse, oldCourse);
        console.log({oldCourse, newCourse});
    })
}

function checkCourseDifference(newCourse, oldCourse) {
    if (!oldCourse || !newCourse) return;

    const newSectionList = newCourse.list;
    const oldSectionList = oldCourse.list;

    const courseName = getCourseName(newSectionList);

    newSectionList.forEach(newSection => {
        const sectionName = getSectionName(newSection);
        const oldSection = oldSectionList.find(e => e.docId === newSection.docId);
        if (!oldSection) {
            sendNotification(courseName, `New Section added for ${courseName}`);
            return;
        }
        const oldStatus = oldSection.packageEnrollmentStatus.status.toLowerCase();
        const newStatus = newSection.packageEnrollmentStatus.status.toLowerCase();

        if (oldStatus !== newStatus) {
            sendNotification(courseName, `Section ${sectionName} is ${newStatus} now`);
        }
    });
}

async function getMadGradesURL(courseName) {
    const options = {headers: {"Authorization": "Token token=16d5319478d74e9ab353cc56e74cc6ea"}};
    const url = `https://api.madgrades.com/v1/courses?query=${courseName}`;
    return await fetch(url, options).then(res => res.json())
        .then(res => res.results[0].uuid)
        .then(uuid => `https://madgrades.com/courses/${uuid}`)
        .catch(() => null)
}

function timeToString(time) {
    return new Date(time).toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric'});
}

function sendNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon128.png",
        title,
        message
    });
}

function handleError(err) {
    if (err.message === "Failed to fetch") {
        sendNotification("Login required", "Please login to your wisc account");
        window.open("https://enroll.wisc.edu/");
    }
    throw err;
}


function getCourseName(course) {
    return course[0].sections[0].subject.shortDescription + " " + course[0].catalogNumber;
}

function getSectionName(section) {
    return section.sections.map(e => `${e.type} ${e.sectionNumber}`).join("; ");
}
