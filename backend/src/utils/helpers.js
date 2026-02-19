function rolePlaceholders(count) {
  return Array(count).fill('?').join(',');
}

module.exports = { rolePlaceholders };
