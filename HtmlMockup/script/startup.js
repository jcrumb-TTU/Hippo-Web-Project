const searchbar = `
		<div class="query">
			<form method=get>
				<input id=name></>
				<select id="cat">
					<option value="all">All</option>
					<option value="category1">Category1</option>
					<option value="category2">Category2</option>
				</select>
				<input type=submit value="Search"></>
			</form>
		</div>
	`;
const links = [{label: "Account", link: "user_profile.html"}]
function makeHeader(){
	console.log("Making header...")
	let h = document.createElement("header");
	h.innerHTML = searchbar;
	links.forEach((l) => {let sep = document.createElement("div"); sep.setAttribute("class", "vseperator"); h.appendChild(sep); let link = document.createElement("a"); link.setAttribute("href",l.link); link.innerHTML = l.label; h.appendChild(link);});	
	document.body.insertBefore(h, document.body.firstElementChild)
}

document.addEventListener("DOMContentLoaded", makeHeader);
