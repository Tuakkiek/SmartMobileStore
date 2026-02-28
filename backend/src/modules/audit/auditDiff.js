import { isDeepStrictEqual } from "node:util";

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const normalizeValue = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)])
    );
  }

  return value;
};

const flattenObject = (value, prefix = "", target = {}) => {
  if (!isPlainObject(value)) {
    if (prefix) {
      target[prefix] = normalizeValue(value);
    }
    return target;
  }

  const entries = Object.entries(value);
  if (entries.length === 0 && prefix) {
    target[prefix] = {};
    return target;
  }

  for (const [key, childValue] of entries) {
    const childPath = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(childValue)) {
      flattenObject(childValue, childPath, target);
      continue;
    }
    target[childPath] = normalizeValue(childValue);
  }

  return target;
};

const setPathValue = (target, path, value) => {
  const parts = String(path || "")
    .split(".")
    .filter(Boolean);
  if (parts.length === 0) {
    return target;
  }

  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    if (!isPlainObject(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }

  cursor[parts[parts.length - 1]] = value;
  return target;
};

const unflattenObject = (flattened = {}) => {
  const output = {};
  for (const [path, value] of Object.entries(flattened)) {
    setPathValue(output, path, value);
  }
  return output;
};

export const computeAuditDiff = ({ before = {}, after = {} } = {}) => {
  const beforeFlat = flattenObject(before || {});
  const afterFlat = flattenObject(after || {});

  const changedPaths = [];
  const oldFlat = {};
  const newFlat = {};

  const allPaths = new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)]);
  for (const path of allPaths) {
    const beforeValue = Object.prototype.hasOwnProperty.call(beforeFlat, path)
      ? beforeFlat[path]
      : null;
    const afterValue = Object.prototype.hasOwnProperty.call(afterFlat, path)
      ? afterFlat[path]
      : null;

    if (isDeepStrictEqual(beforeValue, afterValue)) {
      continue;
    }

    changedPaths.push(path);
    oldFlat[path] = beforeValue;
    newFlat[path] = afterValue;
  }

  changedPaths.sort((left, right) => left.localeCompare(right));

  return {
    changedPaths,
    oldValues: unflattenObject(oldFlat),
    newValues: unflattenObject(newFlat),
  };
};

export default {
  computeAuditDiff,
};
