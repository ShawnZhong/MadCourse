'use strict';

function notify(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title,
        message
    });
}

function require_login(err) {
    console.log(err)
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon.png",
        title: "Login required",
        message: "Please login wisc account"
    });
    window.open("https://enroll.wisc.edu/");
}


function get_course_list() {
    return new Promise(f => chrome.storage.local.get(["urls"], result => f(result.urls ? result.urls : [])))
}

function modify_course_list(g) {
    return new Promise(f => get_course_list().then(c => chrome.storage.local.set({ urls: g(c) }, f)))
}

function modify_single_course(id, g) {
    return new Promise(f => {
        modify_course_list(list => {
            g(list.filter(e => e.id == id)[0])
            return list;
        })
    })
}

function load_course(c) {
    return fetch(`https://enroll.wisc.edu/api/search/v1/enrollmentPackages/${term}/${c.id.replace("-", "/")}`)
        .then(res => res.json()).then(e => course(e, c))
}