'use strict';

var course_list_dom = document.getElementById("course_list");
var search_result_dom = document.getElementById("search-result");


function get_course_list() {
  return new Promise(f => chrome.storage.local.get(["urls"], result => f(result.urls ? result.urls : [])))
}

function set_course_list(g) {
  return new Promise(f => get_course_list().then(c => chrome.storage.local.set({ urls: g(c) }, f)))
}

function timeToString(time) {
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
}

function load_course(id) {
  return fetch(`https://enroll.wisc.edu/api/search/v1/enrollmentPackages/1194/${id.replace("-", "/")}`).then(res => res.json()).then(course)
}

function require_login() {
  window.open("https://enroll.wisc.edu/")
}

function search() {
  var data = {
    "queryString": document.getElementById("course-input").value,
    "selectedTerm": "1194",
    "sortOrder": "SCORE",
    "page": 1,
    "pageSize": 10
  }

  var options = {
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
        var id = `${c.subject.subjectCode}-${c.courseId}`;
        var html = `
      <div class="list-group-item list-group-item-action" id="result-${id}" style="cursor: pointer;">
        ${c.courseDesignation}
      </li>\n`;
        search_result_dom.insertAdjacentHTML("beforeend", html);
        document.getElementById(`result-${id}`).addEventListener("click", () => {
          set_course_list(c => c.concat(id)).then(load_course(id));
          $("#search-result").collapse('hide');
        })
      })
      $("#search-result").collapse('show');
    });
}

document.getElementById("search-btn").addEventListener("click", search)

document.getElementById("course-input").addEventListener("keyup", (event) => {
  if (event.keyCode === 13) search();
});

function section(s) {
  var status = s.packageEnrollmentStatus.status;
  var badge_html = {
    "CLOSED": `<span class="badge badge-danger">${status}</span>`,
    "OPEN": `<span class="badge badge-success">${s.packageEnrollmentStatus.availableSeats} ${status}</span>`,
    "WAITLISTED": `<span class="badge badge-info">${s.enrollmentStatus.waitlistCurrentSize} ${status}</span>`
  }

  var title = s.sections.map(e => `${e.type} ${e.sectionNumber}`).join("; ");

  var time = s.classMeetings.reverse().filter(e => e.meetingType == "CLASS")
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
        <small class="text-muted">Last changed on ${new Date(s.lastUpdated).toLocaleString()}</small>
      </div>
    </div>`;
}

function course(c) {
  var id = `${c[0].subjectCode}-${c[0].courseId}`;
  var html = `
  <div class="card mb-3" id="${id}" style="min-width: 350px">
    <div class="card-header d-flex w-100 justify-content-between">
        <h5 style="text-align: left; font-weight: bold; margin: 0; line-height: 175%;">
          ${c[0].sections[0].subject.shortDescription} ${c[0].catalogNumber}
        </h5>
        <button id="del-${id}" class="btn bmd-btn-icon dropdown-toggle" type="button" style="margin: 0;" >
              <i class="material-icons">delete_outline</i>
        </button>
    </div>
    <div class="list-group">
      ${c.reverse().map(section).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
    </div>
  </div>`;

  course_list_dom.insertAdjacentHTML("beforeend", html);

  document.getElementById("del-" + id).addEventListener("click", () => {
    set_course_list(c => c.filter(e => e != id)).then(document.getElementById(id).remove());
  })
}


get_course_list().then(c => Promise.all(c.map(load_course)).catch(require_login))