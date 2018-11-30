'use strict';

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

  var time = s.classMeetings.reverse().filter(e => e.meetingType == "CLASS").map(e => `${e.meetingDays} ${timeToString(e.meetingTimeStart)} - ${timeToString(e.meetingTimeEnd)}`).join(`</p><p style="padding-left: 3em;">`);

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
        <small class="text-muted">Last updated on ${new Date(s.lastUpdated).toLocaleString()}</small>
      </div>
    </div>`;
}

function course(c) {
  return `
  <div class="card mb-3">
    <h6 class="card-header" style="text-align: left; font-weight: bold;">
    ${c[0].sections[0].subject.shortDescription} ${c[0].catalogNumber}
    </h6>
    <div class="list-group">
      ${c.reverse().map(s => section(s)).join(`<div class="dropdown-divider" style="margin: 0;"></div>`)}
    </div>
  </div>
  `;
}

fetch("https://enroll.wisc.edu/api/search/v1/enrollmentPackages/1194/266/024209")
  .then(data => data.json())
  .then(c => {
    document.getElementById("course_list").innerHTML = course(c);
    c.map(e => document.getElementById(e.docId))
      .forEach(e => e.addEventListener("click", () => {
        var detail = e.getElementsByClassName("section-detail")[0];
        detail.style.display = detail.style.display == "none" ? "block" : "none";
      }));
  })