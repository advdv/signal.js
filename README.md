signal.js
=========

[![Build Status](https://travis-ci.org/advanderveer/signal.js.png?branch=master)](https://travis-ci.org/advanderveer/signal.js)

An isomorphic routing based on the [Symfony2 Routing component](https://github.com/symfony/Routing) but more minimal, allows for both the matching as well as the generation of urls. 

Goals
---------
+   It should be suited for the browser, a small file size and should browserify easily.
+   Only focus on associating certain attributes with certain routes, make no assumptions on how you use the router.
+   Urls can be generated based on the the routes name, this allows for more decoupling
+   Allow for easy configuration using JSON but also expose an clear api