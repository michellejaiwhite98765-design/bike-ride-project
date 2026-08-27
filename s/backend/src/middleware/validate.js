export function validateBody(schema) {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    req.validatedQuery = schema.parse(req.query);
    next();
  };
}

export function validateParams(schema) {
  return (req, _res, next) => {
    req.params = schema.parse(req.params);
    next();
  };
}
