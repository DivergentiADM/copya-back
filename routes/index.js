
const express = require("express");
const router = express.Router();


const socialRoutes = require("./social");
const postRouter = require("./posts");
const scrapingRoutes = require("./scraping");
const planRoutes = require("./plans");
const agentRoutes = require("./agents");
const adminRoutes = require("./admin"); 
const userRoutes = require("./user");
const routerStorytelling = require("./storytelling");
const routerRoles = require("./roles");
const permissionRoutes = require("./permissions");
const paymentRoutes = require("./payments");
const firebaseAuthRoutes = require('./firebaseAuth');
const routerContent = require('./content')
const routerImagen = require('./image')
const chatRoutes = require('./chat');


router.use("/imagen", routerImagen);
router.use("/content", routerContent);
router.use("/firebase", firebaseAuthRoutes);
router.use("/social", socialRoutes);
router.use("/posts", postRouter);
router.use("/scraping", scrapingRoutes);
router.use("/plans", planRoutes);
router.use("/agents", agentRoutes);
router.use("/payments", paymentRoutes);
router.use("/admin", adminRoutes); // Usar rutas de admin
router.use("/user", userRoutes);
router.use("/storytelling", routerStorytelling);
router.use("/roles", routerRoles);
router.use("/permissions", permissionRoutes);
router.use("/chat", chatRoutes);

module.exports = router;

