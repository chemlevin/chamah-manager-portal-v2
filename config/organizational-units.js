const UNIT_TYPES = Object.freeze({
  daycare: 'daycare',
  overhead: 'overhead',
  project: 'project',
});

const CURRENT_KNOWN_UNITS = Object.freeze([
  Object.freeze({ name: 'מחנה', type: UNIT_TYPES.daycare }),
  Object.freeze({ name: 'נאות', type: UNIT_TYPES.daycare }),
  Object.freeze({ name: 'אשקלון', type: UNIT_TYPES.daycare }),
  Object.freeze({ name: 'מרכזי', type: UNIT_TYPES.overhead }),
  Object.freeze({ name: 'סניף', type: UNIT_TYPES.overhead }),
  Object.freeze({ name: 'גנון', type: UNIT_TYPES.project }),
  Object.freeze({ name: 'משרד', type: UNIT_TYPES.overhead }),
  Object.freeze({ name: 'פיתוח', type: UNIT_TYPES.project }),
]);

module.exports = {
  UNIT_TYPES,
  CURRENT_KNOWN_UNITS,
};
