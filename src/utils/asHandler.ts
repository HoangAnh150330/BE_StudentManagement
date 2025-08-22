// src/utils/asHandler.ts
import { RequestHandler, Response, NextFunction } from "express";
import { AuthRequest } from "../types/express";

export const asHandler = (
  fn: (req: AuthRequest, res: Response) => any | Promise<any>
): RequestHandler => {
  return async (req, res, next: NextFunction) => {
    try {
      await Promise.resolve(fn(req as AuthRequest, res));
    } catch (err) {
      next(err);
    }
  };
};
