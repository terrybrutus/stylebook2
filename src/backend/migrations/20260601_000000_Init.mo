import Map "mo:core/Map";

module {
  // No stable fields in the deployed version (empty actor)
  type OldActor = {};

  type PhaseType = { #active; #processing };

  type PhaseDef = {
    phaseLabel : Text;
    durationMinutes : Nat;
    phaseType : PhaseType;
  };

  type PhaseInstance = {
    phaseLabel : Text;
    durationMinutes : Nat;
    phaseType : PhaseType;
  };

  type Service = {
    id : Text;
    name : Text;
    price : Float;
    colorHex : Text;
    isMultiPhase : Bool;
    phases : [PhaseDef];
    finishingLabel : ?Text;
  };

  type Appointment = {
    id : Text;
    clientName : Text;
    serviceId : Text;
    date : Text;
    startTime : Text;
    durationMinutes : Nat;
    price : Float;
    phone : ?Text;
    notes : ?Text;
    phases : ?[PhaseInstance];
  };

  type Settings = {
    var startWeekOnMonday : Bool;
    var workingHoursStart : Text;
    var workingHoursEnd : Text;
  };

  type NewActor = {
    appointments : Map.Map<Text, Appointment>;
    services : Map.Map<Text, Service>;
    settings : Settings;
    state : { var nextAppointmentId : Nat; var nextServiceId : Nat; var servicesSeeded : Bool };
  };

  public func migration(_old : OldActor) : NewActor {
    let services = Map.empty<Text, Service>();
    // Seed the 13 default services on fresh install
    let defaultSvcs : [(Text, Text, Float, Text, Bool, [PhaseDef], ?Text)] = [
      ("svc-default-0",  "Shampoo",                    10.0,  "#6B7280", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-1",  "Shampoo/Style",              28.0,  "#8B5CF6", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-2",  "Shampoo/Haircut (no style)", 25.0,  "#06B6D4", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-3",  "Shampoo/Haircut/Style",      38.0,  "#3B82F6", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-4",  "Men's Haircut",              25.0,  "#10B981", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-5",  "Beard Trim",                 10.0,  "#F59E0B", false, [],                                                                                                                                                                                                                                null),
      ("svc-default-6",  "Perm",                       65.0,  "#EC4899", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Finish"; durationMinutes=30; phaseType=#active}],                                  ?("Finish")),
      ("svc-default-7",  "Perm/Style",                 75.0,  "#F97316", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Style"; durationMinutes=30; phaseType=#active}],                                   ?("Style")),
      ("svc-default-8",  "Perm/Haircut/Style",         85.0,  "#EF4444", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Haircut/Style"; durationMinutes=30; phaseType=#active}],                            ?("Haircut/Style")),
      ("svc-default-9",  "Color",                      60.0,  "#A855F7", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Finish"; durationMinutes=15; phaseType=#active}],                                  ?("Finish")),
      ("svc-default-10", "Color/Style",                70.0,  "#14B8A6", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Style"; durationMinutes=30; phaseType=#active}],                                   ?("Style")),
      ("svc-default-11", "Color/Haircut/Style",        80.0,  "#F43F5E", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Haircut/Style"; durationMinutes=30; phaseType=#active}],                            ?("Haircut/Style")),
      ("svc-default-12", "Facial Waxing",              10.0,  "#D97706", false, [],                                                                                                                                                                                                                                null),
    ];
    for ((id, name, price, colorHex, isMultiPhase, phases, finishingLabel) in defaultSvcs.values()) {
      services.add(id, { id; name; price; colorHex; isMultiPhase; phases; finishingLabel });
    };
    {
      appointments = Map.empty<Text, Appointment>();
      services;
      settings = { var startWeekOnMonday = false; var workingHoursStart = "08:00"; var workingHoursEnd = "19:00" };
      state = { var nextAppointmentId = 1; var nextServiceId = 1; var servicesSeeded = true };
    };
  };
};
