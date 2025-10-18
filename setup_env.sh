#!/usr/bin/env bash
#NOTE THIS SCRIPT IS DEPRECATED, AND PROBABLY WON'T WORK!
{
REPO_NAME="Hippo-Web-Project"
REPO_OWNER="jcrumb-TTU"
#First commit id
REPO_ID="c5bfa786dc1ba3303d1a0fec4efbd62bb8f61ecd"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME.git"
SCRIPT_PATH=$(realpath -m "$0")
SCRIPT_DIR=$(realpath -m $(dirname "$SCRIPT_PATH"))
REPO_DIR="$(cd $SCRIPT_DIR;git rev-parse --show-toplevel)";
USER=$(whoami)
PUB_PATH="/home/public/$USER"
DEST_PATH=$(realpath -m "$PUB_PATH/$REPO_NAME");
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
	elif [[ "$(git rev-list --parents HEAD | tail -1)" == $REPO_ID  ]];
		then STATUS=0;
		else STATUS=1; 
	fi
	cd -;
	return $STATUS
}

install_repo(){
	# Check if DEST_PATH = SCRIPT DIR. If it does, we skip to 'cd "$DEST_PATH"'.
	if ! [ "$SCRIPT_DIR" = "$DEST_PATH" ]
	then
		# Get info on the script dir and the target dir.
		is_repo "$DEST_PATH"
		dd_status=$?
		is_repo "$SCRIPT_DIR"
		sd_status=$?
		#echo "Destination Status: $dd_status"
		#echo "Script Dir Status: $sd_status"
		if [ $dd_status -gt 0 ]
		then
			if [ $dd_status -eq 1 ]
			then
				conflict_path="$PUB_PATH/conflicts/$(date +%m.%d.%y.%H:%m:%S)"
				mkdir -p "$conflict_path";
				mv "$DEST_PATH" "$conflict_path/"
			fi
			if [ $sd_status -eq 0 ]
			then
				mv "$SCRIPT_DIR" "$DEST_PATH"
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
	fi
	cd "$DEST_PATH"
	git pull
	return 0
}

restore_db(){
	#Ensure mongod is running
	sudo systemctl start mongod
	#Restore the database
	sudo mongorestore "$DEST_PATH/Database/dump/"
}

run_dotnet_script(){
	# Install dotnet if not present.
	if ! wget "https://dot.net/v1/dotnet-install.sh" -O "$HOME/dotnet-install.sh"
	then
		echo "Failed to download dotnet install script."
	fi
	chmod u+x "$HOME/dotnet-install.sh"
	if "$HOME/dotnet-install.sh"; then echo 'export PATH=$PATH:~/.dotnet/' >> "$HOME/.bashrc"; fi
}

setup_gitmodules(){
	cd "$SCRIPT_DIR";
	echo "Getting submodules..."
	git submodule update --init --recursive --remote --progress
}

setup_swagger(){
	cd "$DEST_PATH/submodules/swagger-ui";
	git reset --hard
	git apply "$DEST_PATH/submodules/module-patches/swagger-ui.patch"
	cd "$DEST_PATH/submodules/swagger-validator";
	git reset --hard
	git apply "$DEST_PATH/submodules/module-patches/swagger-validator.patch"
	echo "Installing swagger to $DEST_PATH/srv/dev/swagger..."
	cp -r "$DEST_PATH/submodules/swagger-ui/dist" "$DEST_PATH/srv/dev/swagger/"
}


check_installs(){
# Make array for apt packages to get.
declare -a apt_deps_needed
# Look for dotnet install. which exits 1 if not present.
if ! installed dotnet
then
	RELOAD_PATH=1
	echo "Starting dotnet install in background..."
	run_dotnet_script &
else
	echo "dotnet found"
fi

if ! installed git
then
	apt_deps_needed+=("git")
	#sudo apt -y install git
else
	echo "git is installed."
fi
if ! installed mvn
then
	apt_deps_needed+=("maven")
fi
if ! installed mongod || ! installed mongorestore
then
	if [ $(dpkg -l | grep -c "mongodb-org ") -ne 0 ]
	then
		echo "mongodb-org installed, but not all commands are present."
		exit 1;
	fi
	echo "Queueing install of mongodb-org apt package..."
	apt_deps_needed+=("mongodb-org")
else
	echo "mongodb & its tools are installed."
fi
if [ ${#apt_deps_needed[@]} -gt 0 ]
then
	echo "Installing dependencies with apt. Escalating privilidges..."
	if ! sudo apt -y install ${apt_deps_needed[@]}
	then
		echo "Install apt dependencies failed."
		return 1
	fi
fi
setup_gitmodules
if [ $RELOAD_PATH -eq 1 ]
then
	echo "Waiting for dotnet install..."
	wait
	echo "Dotnet install finished."
fi
}

echo "Ensuring all software is installed..."
check_installs
echo "Making public dir in '/home/public'..."
create_public
echo "Setting up repository there..."
if ! install_repo
then echo "Install failed. Exitting..."; exit; fi;
echo "Configuring nginx..."
sudo systemctl stop nginx
sudo cp -r ./nginx_config/* /etc/nginx/
echo "Restoring mongodb..."
restore_db
echo "Patching and installing swagger modules..."
setup_swagger
if [ $RELOAD_PATH -ne 0 ]
then
	echo "REMINDER: You must restart your terminal before running dotnet."
fi
cd "$DEST_PATH"
}
