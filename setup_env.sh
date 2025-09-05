#!/usr/bin/env bash
{
REPO_NAME="Hippo-Web-Project"
REPO_OWNER="jcrumb-TTU"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME.git"
SCRIPT_PATH=$(realpath "$0")
SCRIPT_DIR=$(realpath $(dirname "$SCRIPT_PATH"))
USER=$(whoami)
PUB_PATH="/home/public/$USER"
RELOAD_PATH=0
# Forces bash to load the entire file in case it is overwritten by the git clone later.
installed(){
	which "$1" &> /dev/null
}

create_public(){
	# If directory not present, create it.
	if ! [ -d "$PUB_PATH" ]; then sudo mkdir -p "$PUB_PATH"; fi;
	# If directory permissions are incorrect, change them.
	if ! [ $(stat -c %a "/home/public") = "755" ]; then sudo chmod 755 "/home/public"; fi;
	# If directory owner is incorrect, change it.
	if ! [ $(stat -c %U "$PUB_PATH") = "$USER" ]; then sudo chown "$USER:$USER" "$PUB_PATH"; fi;	
}

# Return 0 if it is the correct repo, 1 if it exists but isn't the correct repo, 2 if it doesn't exist.
is_repo(){
	if ! cd "$1" &>/dev/null; then return 2; fi;
	git rev-parse --is-inside-work-tree &> /dev/null
	STATUS=$?;
	if [ $STATUS -ne 0 ]
	then
		return 1;
	elif [[ "$(git config --get remote.origin.url)" == *$REPO_OWNER/$REPO_NAME.git  ]];
		then STATUS=0;
		else STATUS=1; 
	fi
	cd -;
	return $STATUS
}

install_repo(){
	dest_path=$(realpath "$PUB_PATH/$REPO_NAME");
	# Get info on the script dir and the 
	is_repo "$dest_path"
	dd_status=$?
	is_repo "$SCRIPT_DIR"
	sd_status=$?
	echo "Destination Status: $dd_status"
	echo "Script Dir Status: $sd_status"
	if [ $dd_status -gt 0 ]
	then
		if [ $dd_status -eq 1 ]
		then
			conflict_path="$PUB_PATH/conflicts/$(date +%m.%d.%y.%H:%m:%S)"
			mkdir -p "$conflict_path";
			mv "$dest_path" "$conflict_path/"
		fi
		if [ $sd_status -eq 0 ]
		then
			mv "$SCRIPT_DIR" "$dest_path"
		else
			cd "$PUB_PATH"
			if ! git clone "$REPO_URL"
			then
				return 1
			fi
			cd "$REPO_NAME"
			return 0
		fi
	fi
	cd "$dest_path"
	git pull
	return 0
}
echo "Ensuring all software is installed..."

# Look for dotnet install. which exits 1 if not present.
if ! installed dotnet
then
	cd ~/
	# Install dotnet if not present.
	if ! wget https://dot.net/v1/dotnet-install.sh -O dotnet-install.sh
	then
		echo "Failed to download dotnet install script."
	fi
	chmod u+x "./dotnet-install.sh"
	if ./dotnet-install.sh; then echo 'export PATH=$PATH:~/.dotnet/' >> .bashrc; RELOAD_PATH=1; fi
	cd - &>/dev/null
else
	echo "dotnet found"
fi

if ! installed git
then
	echo "Installing git with apt. Escalating privilidges..."
	sudo apt install git
else
	echo "git is installed."
fi

echo "Making public dir in '/home/public'..."
create_public
echo "Setting up repository there..."
if ! install_repo
then echo "Install failed. Exitting..."; exit; fi;
echo "Configuring nginx..."
sudo systemctl stop nginx
sudo cp -r ./nginx_config/* /etc/nginx/
if [ $RELOAD_PATH -ne 0 ]
then
	echo "REMINDER: You must restart your terminal before running dotnet."
fi
}
