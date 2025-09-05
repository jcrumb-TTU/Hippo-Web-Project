# Demo Description
This demo will serve the html files in the HtmlMockup folder and print data sent to the /api/register endpoint to the console. This entails configuring software in the guest os as well as changing the configuration for the VM in the host os.

# Setup Steps
## VM Guest Port Forwarding Setup
1) Open VirtualBox in the host, and navigate to the VM's settings.
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/e611090d-a1bd-4d8e-9646-6bd981f1eef6" />

2) In the settings prompt navigate to the Network Settings Pane, open the Advanced Settings dropdown, then select "Port Forwarding"
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/42b6b91a-344a-461a-a553-ef073e92207e" />

3) Add a new configuration. Set the Host IP to 127.0.0.1, and the Guest IP to 0.0.0.0. Set the Guest Port to 80 and the Host Port to an open port on your machine.
    - Port 80 is used for the Host Machine in the example, but if it is in use on the Host Machine, something like 46108 might be better.
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/fc6e7bbd-eacb-42ac-9a59-6ba4ee83e920" />

4) Select "Ok" in the Port Forwarding and Settings Dialogs to save your changes.

## Automatic Setup
The remaining setup steps (Additional Software, making the public directory, and configuring nginx) can be completed by
1) Putting the repository in the VM
2) Navigating to the repository's directory in the terminal, then running `./setup_env.sh`

## Manual Setup
Do this if you need more fine-grained control over the setup process.
## Additional Software for Guest VM
### Git
- Allows you to download this repo directly into the machine. To install, open a terminal and run `sudo apt install git`.
- After installing, you may want to run `git clone https://github.com/jcrumb-TTU/Hippo-Web-Project.git` to repo download this repo into the VM. This isn't required yet, but may prove helpful and will be required later.
### .Net 8
- You need to install .Net to the VM so you can run the demo backend. A newer version might work, but I used version 8 so its what I'm putting here.
- To install, follow the guide [here](https://learn.microsoft.com/en-us/dotnet/core/install/linux-scripted-manual) to download and run the dotnet install script.
- Then execute `echo PATH=$PATH:~/.dotnet/ >> .bashrc` in a terminal to add it to your PATH.

## Repository Folder Setup
To allow NGINX to access the html files, we need to move them outside of our home directory due to its permissions. To do this, we are going to setup a public folder that all users on the VM can access.
1) Open a terminal Create the directory `/home/public/vboxuser` by running `sudo mkdir -p /home/public/vboxuser`
2) Ensure the permissions on the public folder allow other users to read it by running `chmod a+rX /home/public`
3) Set the owner of the vboxuser folder to the vboxuser user by running `sudo chown vboxuser:vboxuser /home/public/vboxuser`
4) If you cloned this repository earlier, move it into the new folder. Otherwise, `cd` into the /home/public/vboxuser folder and clone the repository there.

## NGINX Setup
- NOTE: I am logged in to the VM from the host via SSH. These steps can also be done using the VM's terminal.
1) `cd` into the Repository Folder.
2) Open ./nginx_config/etc/nginx/sites-available/default in a text editor, and find the root setting in the server configuration. Change the path from /srv/ to /home/public/vboxuser/Hippo-Web-Project/HtmlMockup. Do not forget the ';' after the path.
<img width="1295" height="946" alt="image" src="https://github.com/user-attachments/assets/ab13e379-d85e-4162-ae9e-e1d83b7a23b1" />
3) Replace the appropriate files in the NGINX Config directory with ./nginx_config/etc/nginx/sites-available/default and ./nginx_config/etc/nginx/nginx.conf respectively.
    - This can be done by running `sudo mv ./nginx_config/sites-available/default /etc/nginx/sites-available/default` and `sudo mv ./nginx_config/nginx.conf /etc/nginx/nginx.conf`.
4) Start nginx by running `sudo systemctl start nginx.service`

## Backend Setup
1) `cd` into the Hippo-Exchange subdirectory of the Repository Folder. This should be `/home/public/vboxuser/Hippo-Web-Project/Hippo-Exchange`
2) Execute `dotnet run`. Leave the terminal open.

## Testing the Demo
1) Open a web browser on the host and navigate to 127.0.0.1:VBoxPort/create_account.html
    - VBoxPort is the port selected for the host when port forwarding for the guest was configured earlier.
2) Fill out the account form with valid information. and press submit.
3) Look at the Terminal Running the backend. You should see the information you inputted displayed on the terminal.
