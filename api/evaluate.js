const { evaluateAnswers } = require('./shared');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  res.status(200).json(evaluateAnswers(req.body?.answers || {}));
};
