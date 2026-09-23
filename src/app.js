const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const db = require("./config/database");
const authRoutes = require("./routes/auth.routes");
const misRoutes = require("./routes/mis.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const userRoutes = require("./routes/user.routes");
const departmentRoutes = require("./routes/department.routes");
const teamRoutes = require("./routes/team.routes");
const payoutRoutes = require("./routes/payout.routes");
const organizationRoutes = require("./routes/organization.routes");
const app = express();

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const swaggerDocument = YAML.load(
    "./docs/openapi.yaml"
);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/mis", misRoutes);
app.use("/api/dashboard",dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/payout", payoutRoutes);
app.use("/api/organizations", organizationRoutes);
app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "MIS Platform API is running"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        const [rows] = await db.query("SELECT 1 AS status");

        res.json({
            success: true,
            database: rows[0].status === 1 ? "connected" : "error"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            database: "disconnected"
        });
    }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`MIS API running on port ${PORT}`);
});