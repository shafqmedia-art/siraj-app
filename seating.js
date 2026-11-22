(function (root) {
  'use strict';

  function shuffle(values, random) {
    var result = values.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(random() * (i + 1));
      var value = result[i];
      result[i] = result[j];
      result[j] = value;
    }
    return result;
  }

  function plan(passengers, capacity, buses, random) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100 ||
        !Number.isInteger(buses) || buses < 1 || buses > 30) {
      throw new Error('أدخل عدد باصات من ١ إلى ٣٠ وسعة من ١ إلى ١٠٠.');
    }
    var groups = new Map(), taken = new Set(), assignments = [], pending = [];
    passengers.forEach(function (person) {
      if (person.bus || person.seat) {
        var bus = Number(person.bus), seat = Number(person.seat);
        var key = bus + ':' + seat;
        if (!Number.isInteger(bus) || !Number.isInteger(seat) ||
            bus < 1 || bus > buses || seat < 1 || seat > capacity || taken.has(key)) {
          throw new Error('راجع المقاعد المسندة. يوجد مقعد مكرّر أو خارج سعة الباصات.');
        }
        taken.add(key);
      }
      var group = person.booking_group || person.id;
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(person);
    });

    var ordered = shuffle(Array.from(groups.values()), random || Math.random);
    ordered.sort(function (a, b) { return b.length - a.length; });
    ordered.forEach(function (group) {
      var waiting = group.filter(function (p) { return !p.bus && !p.seat; });
      if (!waiting.length) return;
      var candidates = [];
      for (var bus = 1; bus <= buses; bus++) {
        for (var first = 1; first <= capacity - group.length + 1; first++) {
          // A pair occupies the two seats on one side of the aisle.
          if (group.length === 2 && first % 2 === 0) continue;
          var last = first + group.length - 1;
          var fixed = group.filter(function (p) { return p.bus; });
          if (!fixed.every(function (p) { return +p.bus === bus && +p.seat >= first && +p.seat <= last; })) continue;
          var available = [];
          for (var seat = first; seat <= last; seat++) {
            if (!taken.has(bus + ':' + seat)) available.push(seat);
          }
          if (available.length === waiting.length) candidates.push({ bus: bus, seats: available });
        }
      }
      var selected = shuffle(candidates, random || Math.random)[0];
      if (!selected) { pending.push(waiting); return; }
      waiting.forEach(function (person, index) {
        var seat = selected.seats[index];
        assignments.push({ id: person.id, bus: String(selected.bus), seat: String(seat) });
        taken.add(selected.bus + ':' + seat);
      });
    });
    return { assignments: assignments, pending: pending };
  }

  if (typeof module === 'object' && module.exports) module.exports = plan;
  else root.SIRAJ_SEATING = plan;
})(typeof window === 'undefined' ? this : window);
