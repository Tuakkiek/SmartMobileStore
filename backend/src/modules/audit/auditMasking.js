const REDACTED_VALUE = "***REDACTED***";

const EXPLICIT_MASKED_PATHS = new Set([
  "shippingAddress.fullName",
  "shippingAddress.phoneNumber",
  "shippingAddress.email",
  "shippingAddress.detailAddress",
  "vatInvoice.taxCode",
]);

const isPlainObject = (value) => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const shouldMaskPath = (path) => {
  if (EXPLICIT_MASKED_PATHS.has(path)) {
    return true;
  }

  if (!path.startsWith("paymentInfo.")) {
    return false;
  }

  const lastSegment = path.split(".").pop() || "";
  return /(token|secret|securehash|card)/i.test(lastSegment);
};

const maskNode = (node, path = "") => {
  if (Array.isArray(node)) {
    return node.map((item, index) => maskNode(item, `${path}[${index}]`));
  }

  if (!isPlainObject(node)) {
    if (path && shouldMaskPath(path)) {
      return REDACTED_VALUE;
    }
    return node;
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => {
      const nextPath = path ? `${path}.${key}` : key;

      if (shouldMaskPath(nextPath)) {
        return [key, REDACTED_VALUE];
      }

      return [key, maskNode(value, nextPath)];
    })
  );
};

export const maskSensitiveData = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (!isPlainObject(value) && !Array.isArray(value)) {
    return value;
  }

  return maskNode(value);
};

export const AUDIT_REDACTED_VALUE = REDACTED_VALUE;

export default {
  maskSensitiveData,
  AUDIT_REDACTED_VALUE: REDACTED_VALUE,
};
