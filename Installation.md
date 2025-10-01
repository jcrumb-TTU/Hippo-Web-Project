# What is installed from this repo
* Html: srv/html will be directly copied to /srv/html on the remote.
* Backend: Hippo-Exchange/ will be built on the remote, and installed to /usr/share/Hippo-Backend
* Config: /config/[app] will be installed to /etc/[app], overwriting any files already there.
* On Local VM Instances...
	- Swagger Validator: submodules/swagger-ui/dist will patched and installed at /srv/html/dev/swagger.
	- Swagger UI: submodules/swagger-validator will be patched installed at /usr/share/swagger-validator on the remote.
# What other tools will be installed:
- On a Remote Staging/Production
	- snapd and certbot will be installed.
