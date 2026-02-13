const DEBUG_ENABLED =
  process.env.OMNICHANNEL_DEBUG === "true" || process.env.NODE_ENV !== "production";

const formatContext = (context = {}) => {
  const entries = Object.entries(context).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => {
      if (value === null) {
        return `${key}=null`;
      }

      if (typeof value === "object") {
        try {
          return `${key}=${JSON.stringify(value)}`;
        } catch {
          return `${key}=[object]`;
        }
      }

      return `${key}=${value}`;
    })
    .join(" ");
};

const write = (level, message, context = {}) => {
  const contextText = formatContext(context);
  const line = contextText ? `[OMNI][${level}] ${message} ${contextText}` : `[OMNI][${level}] ${message}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const omniLog = {
  debug(message, context = {}) {
    if (!DEBUG_ENABLED) {
      return;
    }

    write("DEBUG", message, context);
  },

  info(message, context = {}) {
    write("INFO", message, context);
  },

  warn(message, context = {}) {
    write("WARN", message, context);
  },

  error(message, context = {}) {
    write("ERROR", message, context);
  },
};

export default omniLog;
