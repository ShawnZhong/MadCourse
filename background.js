'use strict';
let term;

getTerm().then(async e => {
    term = e;
    setInterval(await loadAllCourses, 18000);
});