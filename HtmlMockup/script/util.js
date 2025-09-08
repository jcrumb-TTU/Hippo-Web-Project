function today(){
    let fd = new Date(Date.now());
    //console.log(fd); //Testing
    return fd.toISOString().match("(^.*)T")[0].slice(0,-1);
}

//console.log(today()); //Testing
