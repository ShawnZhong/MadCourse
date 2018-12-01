'use strict';

document.getElementById("search-btn").addEventListener("click", () => {
  var data = {
    "queryString": document.getElementById("course-input").value,
    "selectedTerm": "1194",
    "sortOrder": "SCORE"
  }

  var options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8"
    },
    body: JSON.stringify(data)
  }

  fetch("https://enroll.wisc.edu/api/search/v1", options).then(res => res.json()).then(res => {
    document.getElementById("search-result").innerHTML = res.hits.map(result_list).join("\n");

    res.hits.forEach(c => {
      var id = `${c.subject.subjectCode}/${c.courseId}`;
      document.getElementById(`result-${id}`).addEventListener("click", () => {
        chrome.storage.local.get(["urls"], result => {
          chrome.storage.local.set({ urls: result.urls.concat(id), }, () => load_data());
        });
      })
    })
  })
})

function result_list(c) {
  return `<li class="list-group-item" id="result-${c.subject.subjectCode}/${c.courseId}">${c.courseDesignation}</li>`;
}

function timeToString(time) {
  return new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
}

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
    <div class="list-group-item list-group-item-action flex-column align-items-start" id="${s.docId}">
      <div class="d-flex w-100 justify-content-between">
        <h6 style="margin-bottom: 0; margin-top: 0;">${title}</h6>
        ${badge_html[status]}
      </div>
      <div class="section-detail" style="display: none; padding-top: 1em;">
        <p>Time: ${time}</p>
        <p>Enrollment: ${s.enrollmentStatus.currentlyEnrolled} (enrolled) / ${s.enrollmentStatus.capacity} (capacity)</p>
        <p>Waitlist: ${s.enrollmentStatus.waitlistCurrentSize} (on waitlist) / ${s.enrollmentStatus.waitlistCapacity} (capacity)</p>
        <small class="text-muted">Last changed on ${new Date(s.lastUpdated).toLocaleString()}</small>
      </div>
    </div>`;
}

var course_list_dom = document.getElementById("course_list");

function course(c) {
  var id = `${c[0].subjectCode}/${c[0].courseId}`;
  var html = `
  <div class="card mb-3" id="${id}">
    <div class="d-flex w-100 justify-content-between">
        <h6 class="card-header" style="text-align: left; font-weight: bold;">
          ${c[0].sections[0].subject.shortDescription} ${c[0].catalogNumber}
        </h6>
        <span class="badge badge-danger" id="del-${id}">X</span>
    </div>
    <div class="list-group">
      ${c.reverse().map(section).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
    </div>
  </div>`;

  course_list_dom.insertAdjacentHTML("beforeend", html);

  c.map(e => document.getElementById(e.docId))
    .forEach(e => e.addEventListener("click", () => {
      var detail = e.getElementsByClassName("section-detail")[0];
      detail.style.display = detail.style.display == "none" ? "block" : "none";
    }));

  document.getElementById("del-" + id).addEventListener("click", () => {
    chrome.storage.local.get(["urls"], result => {
      chrome.storage.local.set({
        urls: result.urls.filter(e => !e.endsWith(id)),
      }, () => load_data());
    });
  })

}

function load_data() {
  course_list_dom.innerHTML = "";

  chrome.storage.local.get(["urls"], result => {
    Promise.all(result.urls.map(url => fetch(`https://enroll.wisc.edu/api/search/v1/enrollmentPackages/1194/${url}`).then(res => res.json()).then(course)))
      .catch(() => window.open("https://enroll.wisc.edu/"))
  })
}

load_data();