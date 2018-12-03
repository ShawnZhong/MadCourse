'use strict';

chrome.runtime.onInstalled.addListener();

let course_list_dom = document.getElementById("course_list");
let search_result_dom = document.getElementById("search-result");
var term = 1194;

// fetch("https://enroll.wisc.edu/api/search/v1/terms")
//   .then(res => res.json())
//   .then(e => Math.max(...e.map(e => e.termCode)))
//   .then(e => {
//     term = e;
//     get_course_list().then(c => Promise.all(c.map(load_course)));
//   }).catch(require_login)

get_course_list().then(c => Promise.all(c.map(load_course)));



function search() {
  let data = {
    "queryString": document.getElementById("course-input").value,
    "selectedTerm": term,
    "sortOrder": "SCORE",
    "page": 1,
    "pageSize": 10
  }

  let options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8"
    },
    body: JSON.stringify(data)
  }

  fetch("https://enroll.wisc.edu/api/search/v1", options)
    .then(res => res.json())
    .then(res => {
      search_result_dom.innerHTML = "";
      res.hits.forEach(c => {
        let id = `${c.subject.subjectCode}-${c.courseId}`;
        let html = `
      <div class="list-group-item list-group-item-action" id="result-${id}" style="cursor: pointer;">
        ${c.courseDesignation}
      </li>\n`;
        search_result_dom.insertAdjacentHTML("beforeend", html);
        document.getElementById(`result-${id}`).addEventListener("click", () => {
          modify_course_list(c => c.concat({ id, alarm: false })).then(load_course({ id }));
          $("#search-result").collapse('hide');
        })
      })
      $("#search-result").collapse('show');
    }).catch(require_login)
}

document.getElementById("search-btn").addEventListener("click", search)

document.getElementById("course-input").addEventListener("keyup", (event) => {
  if (event.keyCode === 13) search();
});

function section(s) {
  let status = s.packageEnrollmentStatus.status;
  let badge_html = {
    "CLOSED": `<span class="badge badge-danger">${status}</span>`,
    "OPEN": `<span class="badge badge-success">${s.packageEnrollmentStatus.availableSeats} ${status}</span>`,
    "WAITLISTED": `<span class="badge badge-info">${s.enrollmentStatus.waitlistCurrentSize} ${status}</span>`
  }

  let title = s.sections.map(e => `${e.type} ${e.sectionNumber}`).join("; ");

  let timeToString = (time) => new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });

  let time = s.classMeetings.reverse().filter(e => e.meetingType == "CLASS")
    .map(e => `${e.meetingDays} ${timeToString(e.meetingTimeStart)} - ${timeToString(e.meetingTimeEnd)}`)
    .join(`</p><p style="padding-left: 3em;">`);

  return `
    <div class="list-group-item list-group-item-action flex-column align-items-start" id="${s.docId}" style="cursor: pointer;" data-toggle="collapse" data-target="#detail-${s.docId}">
      <div class="d-flex w-100 justify-content-between">
        <h6 style="margin-bottom: 0; margin-top: 0;">${title}</h6>
        ${badge_html[status]}
      </div>
      <div class="collapse" id="detail-${s.docId}" style="padding-top: 1em;">
        <p>Time: ${time}</p>
        <p>Enrollment: ${s.enrollmentStatus.currentlyEnrolled} (enrolled) / ${s.enrollmentStatus.capacity} (capacity)</p>
        <p>Waitlist: ${s.enrollmentStatus.waitlistCurrentSize} (on waitlist) / ${s.enrollmentStatus.waitlistCapacity} (capacity)</p>
        <small class="text-muted">Last updated on ${new Date(s.lastUpdated).toLocaleString()}</small>
      </div>
    </div>`;
}

function course(c, meta) {
  let id = `${c[0].subjectCode}-${c[0].courseId}`;
  let course_name = c[0].sections[0].subject.shortDescription + " " + c[0].catalogNumber
  let html = `
  <div class="card mb-3" id="${id}" style="min-width: 350px">
    <div class="card-header d-flex w-100 justify-content-between">
        <h5 style="text-align: left; font-weight: bold; margin: 0; line-height: 175%;">
          ${course_name}
        </h5>
        <div>
          <button id="alarm-${id}" class="${!meta.alarm && "disabled"} btn bmd-btn-icon dropdown-toggle" type="button" style="margin: 0;" >
                <i class="material-icons">alarm</i>
          </button>
          <button id="del-${id}" class="btn bmd-btn-icon dropdown-toggle" type="button" style="margin: 0;" >
                <i class="material-icons">delete_outline</i>
          </button>
        </div>
    </div>
    <div class="list-group">
      ${c.reverse().map(section).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
    </div>
  </div>`;

  course_list_dom.insertAdjacentHTML("beforeend", html);

  document.getElementById("del-" + id).addEventListener("click", () => {
    modify_course_list(c => c.filter(e => e.id != id)).then(document.getElementById(id).remove());
  })

  let alarm_dom = document.getElementById("alarm-" + id);
  alarm_dom.addEventListener("click", () => {
    alarm_dom.classList.toggle("disabled");
    modify_single_course(id, e => {
      e.alarm = !e.alarm;
      if (e.alarm) {
        notify("Success", course_name + " is added to watch list")
      } else {
        notify("Success", course_name + " is removed from watch list")
      }
    })
  })
}