function today(){
	let fd = new Date(Date.now());
	//console.log(fd); //Testing
	return fd.toISOString().match("(^.*)T")[0];
}

//console.log(today()); //Testing
