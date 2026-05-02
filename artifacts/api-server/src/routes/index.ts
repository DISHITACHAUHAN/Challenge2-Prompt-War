import { Router, type IRouter } from "express";
import healthRouter from "./health";
import conversationsRouter from "./openai/conversations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/openai/conversations", conversationsRouter);

export default router;
