async function TryCreateAccount(){
const form = document.querySelector("#register");
	if (form === undefined){
		console.log("Could not find the registration form!");
		return;
	}
	let fd = new FormData(form);
	if (fd === undefined){
		console.log("Form Data object is undefined!");
		return;
	}
	return SendForm(fd);
}

async function parseErrorResponse(r){
	console.log("ERROR!");
	let s = await r.json();
	console.log(s);
	console.log(s.keys);
	SetFormValidity(s);
	console.log(s);
	return false;
}

async function parseGoodResponse(r){
	console.log("SUCCESS!")
	console.log(r);
	return true;
}


async function checkResponse(r){
	if(r.ok){
		return r;
	}
	else{
		return Promise.reject(r);
	}
}

async function SendForm(form){
	let req = new Request("/api/register");	
	return fetch(req, {method: "POST", body: form,}).then(checkResponse).then(parseGoodResponse).catch(parseErrorResponse);
}

function SetFormValidity(issues){
	//Input fields from form that aren't buttons.
	let fields = document.querySelectorAll("#register input:not(input[type=submit])")
	let errs = Object.keys(issues);
	//Get field ids
	for (f of fields){
		console.log(issues[f.id]);
		if (errs.includes(f.id)){
			f.setCustomValidity(issues[f.id]);
		}
		else{
			f.setCustomValidity("");
		}
	}
	document.querySelector("#register").reportValidity();
}

async function ResetValidity(field){
	if (!field.checkValidity()){
		field.setCustomValidity("");
		document.querySelector("#register").reportValidity();
	}
}
