'use strict';

async function getTerm() {
    return await fetch("https://enroll.wisc.edu/api/search/v1/terms")
        .then(res => res.json())
        .then(e => Math.max(...e.map(e => e.termCode)))
        .catch(require_login);
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
    return await fetch(url)
        .then(res => res.json())
        .then(list => ({list, ...courseMeta}))
        .catch(require_login)
}

async function loadAllCourses() {
    const courseList = await getCourseList();
    const courseData = await Promise.all(courseList.map(loadCourse));
    await checkDifference(courseData);
    await new Promise(f => chrome.storage.local.set({courseData}, f));
    return courseData;
}

async function checkDifference(data) {
    const oldData = (await new Promise(f => chrome.storage.local.get(["courseData"], f))).courseData;
    if (!oldData) return;

    data.filter(e => e.alarm).forEach(newCourse => {
        const courseName = getCourseName(newCourse.list);

        const oldCourse = oldData.find(e => e.id === newCourse.id);
        console.log({oldCourse, newCourse});
        if (!oldCourse) return;
        const newList = newCourse.list, oldList = oldCourse.list;
        newList.forEach(newSection => {
            const sectionName = getSectionName(newSection);
            const oldSection = oldList.find(e => e.docId === newSection.docId);
            if (!oldSection) {
                notify(courseName, `New Section added for ${courseName}`);
                return;
            }
            const oldStatus = oldSection.packageEnrollmentStatus.status.toLowerCase();
            const newStatus = newSection.packageEnrollmentStatus.status.toLowerCase();

            if (oldStatus !== newStatus) {
                notify(courseName, `Section ${sectionName} is ${newStatus} now`);
            }
        });
    })
}

function timeToString(time) {
    return new Date(time).toLocaleTimeString('en-US', {hour: 'numeric', minute: 'numeric'});
}

function notify(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title,
        message
    });
}

function require_login(err) {
    console.log(err);
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Login required",
        message: "Please login wisc account"
    });
    window.open("https://enroll.wisc.edu/");
}

function getCourseName(course) {
    return course[0].sections[0].subject.shortDescription + " " + course[0].catalogNumber;
}

function getSectionName(section) {
    return section.sections.map(e => `${e.type} ${e.sectionNumber}`).join("; ");
}