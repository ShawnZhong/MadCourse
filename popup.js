'use strict';

const courseListDOM = document.getElementById("course_list");
const searchResultDOM = document.getElementById("search-result");

loadAllCourses().then(e => e.forEach(Course));

function search() {
    const query = document.getElementById("course-input").value;
    searchCourse(query).then(res => {
        searchResultDOM.innerHTML = "";
        res.hits.forEach(SearchResultEntry);
        $("#search-result").collapse('show');
    });
}

document.getElementById("search-btn").addEventListener("click", search);

document.getElementById("course-input").addEventListener("keyup", async (event) => {
    if (event.keyCode === 13) await search();
});

function SearchResultEntry(courseEntry) {
    const id = `${courseEntry.subject.subjectCode}-${courseEntry.courseId}`;
    const html = `
        <div class="list-group-item list-group-item-action" id="result-${id}"
            style="cursor: pointer; overflow: hidden; max-width: 350px; text-overflow: ellipsis; white-space: nowrap; display: inherit">
            <strong>${courseEntry.courseDesignation}</strong>: ${courseEntry.title}
        </div>`;
    searchResultDOM.insertAdjacentHTML("beforeend", html);
    const listener = async () => {
        addToCourseList(id).then(Course);
        $("#search-result").collapse('hide');
    };
    document.getElementById(`result-${id}`).addEventListener("click", listener);
}

function Section(section) {
    const status = section.packageEnrollmentStatus.status;
    const badgeHTML = {
        "CLOSED": `<span class="badge badge-danger">${status}</span>`,
        "OPEN": `<span class="badge badge-success">${section.packageEnrollmentStatus.availableSeats} ${status}</span>`,
        "WAITLISTED": `<span class="badge badge-info">${section.enrollmentStatus.waitlistCurrentSize} ${status}</span>`
    };

    const title = getSectionName(section);
    const time = section.classMeetings.reverse().filter(e => e.meetingType === "CLASS")
        .map(e => `${e.meetingDays} ${timeToString(e.meetingTimeStart)} - ${timeToString(e.meetingTimeEnd)}`)
        .join(`</p><p style="padding-left: 3em;">`);
    const {currentlyEnrolled, capacity, waitlistCurrentSize, waitlistCapacity} = section.enrollmentStatus;
    const enrollment = `${currentlyEnrolled} (enrolled) / ${capacity} (capacity)`
    const waitlist = `${waitlistCurrentSize} (on waitlist) / ${waitlistCapacity} (capacity)`;

    const getInstructorHTML = () => {
        const instructor = section.sections[0].instructor;
        if (!instructor) return "";
        const instructor_name_obj = instructor.personAttributes.name;
        const instructor_name_str = `${instructor_name_obj.first} ${instructor_name_obj.last}`;
        return `
        <p>
            <strong>Instructor</strong>: 
            <a href="https://www.ratemyprofessors.com/search.jsp?queryBy=schoolId&schoolName=University+of+Wisconsin+-+Madison&schoolID=1256&query=${instructor_name_str}" 
                target="_blank"  data-toggle="tooltip" title="Search Rate My Professors">
                ${instructor_name_str}
            </a>
        </p>`;
    };

    const html = `
        <div class="" id="${section.docId}">
          <div class="d-flex w-100 justify-content-between list-group-item list-group-item-action align-items-start"
            style="cursor: pointer;" data-toggle="collapse" data-target="#detail-${section.docId}">
            <h6 style="margin-bottom: 0; margin-top: 0;">${title}</h6>
            ${badgeHTML[status]}
          </div>
          <div class="collapse no-padding" id="detail-${section.docId}" style="padding: 1em;">
            <p><strong>Time</strong>: ${time}</p>
            ${getInstructorHTML()}
            <p><strong>Enrollment</strong>: ${enrollment}</p>
            <p><strong>Waitlist</strong>: ${waitlist}</p>
            <small class="text-muted">Last updated on ${new Date(section.lastUpdated).toLocaleString()}</small>
          </div>
        </div>`;

    return html;
}

function Course(data) {
    if (!data) return;
    const id = `${data.list[0].subjectCode}-${data.list[0].courseId}`;
    const courseName = getCourseName(data.list);

    const html = `
        <div class="card mb-3" id="${id}" style="min-width: 350px">
          <div class="card-header d-flex w-100 justify-content-between">
            <h5 style="text-align: left; font-weight: bold; margin: 0; line-height: 175%;">
              ${courseName}
            </h5>
            <div>
              <button id="madgrades-${id}" class="btn bmd-btn-icon dropdown-toggle" type="button" data-toggle="tooltip" title="Open MadGrades">
                <i class="material-icons">insert_chart_outlined</i>
              </button>
              <button id="alarm-${id}" class="${!data.alarm && " disabled"} btn bmd-btn-icon dropdown-toggle"
                type="button" data-toggle="tooltip" title="${(!data.alarm ? " Enable" : "Disable") + " alarm"}">
                <i class="material-icons">alarm</i>
              </button>
              <button id="del-${id}" class="btn bmd-btn-icon dropdown-toggle" type="button" data-toggle="tooltip" title="Delete">
                <i class="material-icons">delete_outline</i>
              </button>
            </div>
          </div>
          <div class="list-group">
            ${data.list.reverse().map(Section).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
          </div>
        </div>`;
    courseListDOM.insertAdjacentHTML("beforeend", html);

    // Delete icon
    const deleteListener = async () => {
        await removeFromCourseList(id);
        $("#del-" + id).tooltip('dispose');
        document.getElementById(id).remove()
    };
    document.getElementById("del-" + id).addEventListener("click", deleteListener);

    // Alarm icon
    const alarmDOM = document.getElementById("alarm-" + id);
    const alarmListener = () => {
        alarmDOM.classList.toggle("disabled");
        modifyCourseListByCourseID(id, e => e.alarm = !e.alarm).then(e => {
            if (e.alarm) {
                alarmDOM.setAttribute("data-original-title", "Disable alarm");
                sendNotification("Alarm enabled", courseName + " is added to the watch list")
            } else {
                alarmDOM.setAttribute("data-original-title", "Enable alarm");
                sendNotification("Alarm disabled", courseName + " is removed from the watch list")
            }
        });
    };
    alarmDOM.addEventListener("click", alarmListener);

    // Madgrades Icon
    const madGradesListener = async () => {
        const url = await getMadGradesURL(courseName);
        if (url) {
            window.open(url);
        } else {
            sendNotification("Cannot open MadGrades.", "Maybe the course is new.")
        }
    };
    document.getElementById(`madgrades-${id}`).addEventListener("click", madGradesListener);

    // tooltip
    $('[data-toggle="tooltip"]').tooltip();
}