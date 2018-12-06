'use strict';

let course_list_dom = document.getElementById("course_list");
let search_result_dom = document.getElementById("search-result");
let term;

getTerm().then(e => {
    term = e;
    loadAllCourses().then(e => e.forEach(Course));
});

function search() {
    let data = {
        "queryString": document.getElementById("course-input").value,
        "selectedTerm": term,
        "sortOrder": "SCORE",
        "page": 1,
        "pageSize": 10
    };

    let options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify(data)
    };

    fetch("https://enroll.wisc.edu/api/search/v1", options)
        .then(res => res.json())
        .then(res => {
            search_result_dom.innerHTML = "";
            res.hits.forEach(SearchResultEntry);
            $("#search-result").collapse('show');
        }).catch(require_login)
}

document.getElementById("search-btn").addEventListener("click", search);

document.getElementById("course-input").addEventListener("keyup", (event) => {
    if (event.keyCode === 13) search();
});

function SearchResultEntry(c) {
    const id = `${c.subject.subjectCode}-${c.courseId}`;
    const html = `
        <div class="list-group-item list-group-item-action" id="result-${id}"
            style="cursor: pointer; overflow: hidden; max-width: 350px; text-overflow: ellipsis; white-space: nowrap; display: inherit">
            <strong>${c.courseDesignation}</strong>: ${c.title}
        </div>`;
    search_result_dom.insertAdjacentHTML("beforeend", html);
    const listener = async () => {
        addToCourseList(id).then(Course);
        $("#search-result").collapse('hide');
    };
    document.getElementById(`result-${id}`).addEventListener("click", listener);
}

function Section(s) {
    const status = s.packageEnrollmentStatus.status;
    const badge_html = {
        "CLOSED": `<span class="badge badge-danger">${status}</span>`,
        "OPEN": `<span class="badge badge-success">${s.packageEnrollmentStatus.availableSeats} ${status}</span>`,
        "WAITLISTED": `<span class="badge badge-info">${s.enrollmentStatus.waitlistCurrentSize} ${status}</span>`
    };

    const title = getSectionName(s);
    const time = s.classMeetings.reverse().filter(e => e.meetingType === "CLASS")
        .map(e => `${e.meetingDays} ${timeToString(e.meetingTimeStart)} - ${timeToString(e.meetingTimeEnd)}`)
        .join(`</p><p style="padding-left: 3em;">`);
    const enrollment = `${s.enrollmentStatus.currentlyEnrolled} (enrolled) / ${s.enrollmentStatus.capacity} (capacity)`
    const waitlist = `${s.enrollmentStatus.waitlistCurrentSize} (on waitlist) / ${s.enrollmentStatus.waitlistCapacity} (capacity)`;

    const instructor_html = () => {
        const instructor = s.sections[0].instructor;
        if (!instructor) return "";
        const instructor_name_obj = instructor.personAttributes.name;
        const instructor_name_str = `${instructor_name_obj.first} ${instructor_name_obj.last}`;
        return `
        <p>
            <strong>Instructor</strong>: 
            <a href="http://www.ratemyprofessors.com/search.jsp?query=${instructor_name_str}" 
                target="_blank"  data-toggle="tooltip" title="Search Rate My Professors">
                ${instructor_name_str}
            </a>
        </p>`;
    };

    return `
    <div class="" id="${s.docId}">
      <div class="d-flex w-100 justify-content-between list-group-item list-group-item-action align-items-start" 
            style="cursor: pointer;" data-toggle="collapse" data-target="#detail-${s.docId}">
        <h6 style="margin-bottom: 0; margin-top: 0;">${title}</h6>
        ${badge_html[status]}
      </div>
      <div class="collapse no-padding" id="detail-${s.docId}" style="padding: 1em;">   
        <p><strong>Time</strong>: ${time}</p>
        ${instructor_html()}
        <p><strong>Enrollment</strong>: ${enrollment}</p>
        <p><strong>Waitlist</strong>: ${waitlist}</p>
        <small class="text-muted">Last updated on ${new Date(s.lastUpdated).toLocaleString()}</small>
      </div>
    </div>`;
}

function Course(data) {
    if (!data) return;
    let list = data.list;
    let id = `${list[0].subjectCode}-${list[0].courseId}`;
    let course_name = getCourseName(list);
    let html = `
          <div class="card mb-3" id="${id}" style="min-width: 350px">
            <div class="card-header d-flex w-100 justify-content-between">
                <h5 style="text-align: left; font-weight: bold; margin: 0; line-height: 175%;">
                  ${course_name}
                </h5>
                <div>
                 <button class="btn bmd-btn-icon dropdown-toggle" type="button" data-toggle="tooltip" title="Search MadGrades" >
                        <a href="https://madgrades.com/search?query=${course_name}" target="_blank" style="color: unset">
                            <i class="material-icons">insert_chart_outlined</i>
                        </a>
                  </button>
                  <button id="alarm-${id}" class="${!data.alarm && "disabled"} btn bmd-btn-icon dropdown-toggle" 
                            type="button" data-toggle="tooltip" 
                            title="${(!data.alarm ? "Enable" : "Disable") + " alarm"}">
                        <i class="material-icons">alarm</i>
                  </button>
                  <button id="del-${id}" class="btn bmd-btn-icon dropdown-toggle" 
                            type="button" data-toggle="tooltip" title="Delete">
                        <i class="material-icons">delete_outline</i>
                  </button>
                </div>
            </div>
            <div class="list-group">
              ${list.reverse().map(Section).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
            </div>
          </div>`;

    course_list_dom.insertAdjacentHTML("beforeend", html);

    const delete_listener = async () => {
        await removeFromCourseList(id);
        $("#del-" + id).tooltip('dispose');
        document.getElementById(id).remove()
    };
    document.getElementById("del-" + id).addEventListener("click", delete_listener);

    const alarm_dom = document.getElementById("alarm-" + id);
    const alarm_listener = () => {
        alarm_dom.classList.toggle("disabled");
        modifyCourseListByCourseID(id, e => e.alarm = !e.alarm).then(e => {
            if (e.alarm) {
                alarm_dom.setAttribute("data-original-title", "Disable alarm");
                notify("Alarm enabled", course_name + " is added to the watch list")
            } else {
                alarm_dom.setAttribute("data-original-title", "Enable alarm");
                notify("Alarm disabled", course_name + " is removed from the watch list")
            }
        });
    };
    alarm_dom.addEventListener("click", alarm_listener);

    $('[data-toggle="tooltip"]').tooltip();
}