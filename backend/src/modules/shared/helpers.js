

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
function nowPlusHours(hours) {
  return new Date(Date.now() + Number(hours || 0) * 60 * 60 * 1000);
}
module.exports = {
  roundMoney,
  nowPlusHours,
};