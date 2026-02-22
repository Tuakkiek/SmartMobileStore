import { createScopedRepository } from "../../authz/scopedRepository.js";

const resolveMode = (modeOrResolver, req, fallback = "branch") => {
  if (typeof modeOrResolver === "function") {
    return modeOrResolver(req);
  }
  return modeOrResolver || fallback;
};

export const withScopedRepository = (resources = [], options = {}) => (req, res, next) => {
  if (!req.authz) {
    return res.status(401).json({
      success: false,
      code: "AUTHZ_CONTEXT_MISSING",
      message: "Authorization context is missing",
    });
  }

  try {
    const mode = resolveMode(options.mode, req, req.authz.scopeMode || "branch");
    const scopedRepos = {};

    for (const resourceName of resources) {
      scopedRepos[resourceName] = createScopedRepository(resourceName, req.authz, {
        mode,
      });
    }

    req.scopedRepos = scopedRepos;
    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      code: error.code || "AUTHZ_SCOPE_INIT_FAILED",
      message: error.message || "Failed to initialize scoped repository",
    });
  }
};

export default withScopedRepository;
