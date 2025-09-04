Demo Description
This demo will serve the html files in the HtmlMockup folder and print data sent to the /api/register endpoint to the console. This entails configuring software in the guest os as well as changing the configuration for the VM in the host os.

# Setup Steps
## VM Port Forwarding Setup
1) Open VirtualBox in the host, and navigate to the VM's settings.
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/e611090d-a1bd-4d8e-9646-6bd981f1eef6" />

2) In the settings prompt navigate to the Network Settings Pane, open the Advanced Settings dropdown, then select "Port Forwarding"
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/42b6b91a-344a-461a-a553-ef073e92207e" />

3) Add a new configuration. Set the Host IP to 127.0.0.1, and the Guest IP to 0.0.0.0. Set the Guest Port to 80 and the Host Port to an open port on your machine.
  - 80 is used for the Host Machine in the example, but if it is in use on the Host Machine, something like 46108 might be better.
<img width="2880" height="1920" alt="image" src="https://github.com/user-attachments/assets/fc6e7bbd-eacb-42ac-9a59-6ba4ee83e920" />

4) Select "Ok" in the Port Forwarding and Settings Dialogs to save your changes.

   
