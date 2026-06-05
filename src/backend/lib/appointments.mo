import Types "../types/common";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";

module {
  public type AppointmentMap = Map.Map<Types.Id, Types.Appointment>;

  public func create(
    store : AppointmentMap,
    input : Types.CreateAppointmentInput,
    id : Types.Id,
  ) : Types.Appointment {
    let appt : Types.Appointment = {
      id;
      clientName = input.clientName;
      serviceId = input.serviceId;
      date = input.date;
      startTime = input.startTime;
      durationMinutes = input.durationMinutes;
      price = input.price;
      phone = input.phone;
      notes = input.notes;
      phases = input.phases;
    };
    store.add(id, appt);
    appt;
  };

  public func getAll(store : AppointmentMap) : [Types.Appointment] {
    var result : [Types.Appointment] = [];
    for ((_, appt) in store.entries()) {
      result := result.concat([appt]);
    };
    result;
  };

  public func getById(store : AppointmentMap, id : Types.Id) : ?Types.Appointment {
    store.get(id);
  };

  public func update(
    store : AppointmentMap,
    input : Types.UpdateAppointmentInput,
  ) : ?Types.Appointment {
    switch (store.get(input.id)) {
      case null null;
      case (?_) {
        let updated : Types.Appointment = {
          id = input.id;
          clientName = input.clientName;
          serviceId = input.serviceId;
          date = input.date;
          startTime = input.startTime;
          durationMinutes = input.durationMinutes;
          price = input.price;
          phone = input.phone;
          notes = input.notes;
          phases = input.phases;
        };
        store.add(input.id, updated);
        ?updated;
      };
    };
  };

  public func delete(store : AppointmentMap, id : Types.Id) : Bool {
    if (store.containsKey(id)) {
      store.remove(id);
      true;
    } else {
      false;
    };
  };

  public func getByDateRange(
    store : AppointmentMap,
    startDate : Types.ISODate,
    endDate : Types.ISODate,
  ) : [Types.Appointment] {
    var result : [Types.Appointment] = [];
    for ((_, appt) in store.entries()) {
      if (appt.date >= startDate and appt.date <= endDate) {
        result := result.concat([appt]);
      };
    };
    result;
  };

  public func getByClientName(
    store : AppointmentMap,
    clientName : Text,
  ) : [Types.Appointment] {
    var result : [Types.Appointment] = [];
    for ((_, appt) in store.entries()) {
      if (appt.clientName == clientName) {
        result := result.concat([appt]);
      };
    };
    result;
  };

  public func getAllClientNames(store : AppointmentMap) : [Text] {
    let seen = Set.empty<Text>();
    var result : [Text] = [];
    for ((_, appt) in store.entries()) {
      if (not seen.contains(appt.clientName)) {
        seen.add(appt.clientName);
        result := result.concat([appt.clientName]);
      };
    };
    result;
  };
};
