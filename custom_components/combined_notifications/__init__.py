Logger: homeassistant.setup
Source: setup.py:425
First occurred: 12:11:59 PM (1 occurrence)
Last logged: 12:11:59 PM

Error during setup of component combined_notifications: Added route will never be executed, method GET is already registered
Traceback (most recent call last):
  File "/usr/src/homeassistant/homeassistant/setup.py", line 425, in _async_setup_component
    result = await task
             ^^^^^^^^^^
  File "/config/custom_components/combined_notifications/__init__.py", line 53, in async_setup
    await hass.http.async_register_static_paths([
        StaticPathConfig(PANEL_URL + ".js", panel_path, False)
    ])
  File "/usr/src/homeassistant/homeassistant/components/http/__init__.py", line 523, in async_register_static_paths
    self._async_register_static_paths(configs, resources)
    ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^
  File "/usr/src/homeassistant/homeassistant/components/http/__init__.py", line 543, in _async_register_static_paths
    self.app.router.add_route(
    ~~~~~~~~~~~~~~~~~~~~~~~~~^
        "GET", config.url_path, partial(target, config.path)
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    )
    ^
  File "/usr/local/lib/python3.14/site-packages/aiohttp/web_urldispatcher.py", line 1188, in add_route
    return resource.add_route(method, handler, expect_handler=expect_handler)
           ~~~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/local/lib/python3.14/site-packages/aiohttp/web_urldispatcher.py", line 371, in add_route
    raise RuntimeError(
    ...<3 lines>...
    )
RuntimeError: Added route will never be executed, method GET is already registered
