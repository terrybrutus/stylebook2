import Types "../types/common";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  public type ServiceMap = Map.Map<Types.Id, Types.Service>;

  public func create(
    store : ServiceMap,
    input : Types.CreateServiceInput,
    id : Types.Id,
  ) : Types.Service {
    let svc : Types.Service = {
      id;
      name = input.name;
      price = input.price;
      colorHex = input.colorHex;
      isMultiPhase = input.isMultiPhase;
      phases = input.phases;
      finishingLabel = input.finishingLabel;
    };
    store.add(id, svc);
    svc;
  };

  public func getAll(store : ServiceMap) : [Types.Service] {
    var result : [Types.Service] = [];
    for ((_, svc) in store.entries()) {
      result := result.concat([svc]);
    };
    result;
  };

  public func getById(store : ServiceMap, id : Types.Id) : ?Types.Service {
    store.get(id);
  };

  public func update(
    store : ServiceMap,
    input : Types.UpdateServiceInput,
  ) : ?Types.Service {
    switch (store.get(input.id)) {
      case null null;
      case (?_) {
        let updated : Types.Service = {
          id = input.id;
          name = input.name;
          price = input.price;
          colorHex = input.colorHex;
          isMultiPhase = input.isMultiPhase;
          phases = input.phases;
          finishingLabel = input.finishingLabel;
        };
        store.add(input.id, updated);
        ?updated;
      };
    };
  };

  public func delete(store : ServiceMap, id : Types.Id) : Bool {
    if (store.containsKey(id)) {
      store.remove(id);
      true;
    } else {
      false;
    };
  };

  // Seed the store with the 13 default services if empty
  public func seedDefaults(store : ServiceMap) {
    if (store.size() > 0) return;

    let defaults : [(Text, Float, Text, Bool, [Types.PhaseDef], ?Text)] = [
      ("Shampoo",                    10.0,  "#6B7280", false, [],                                                                                                                                                                                         null),
      ("Shampoo/Style",              28.0,  "#8B5CF6", false, [],                                                                                                                                                                                         null),
      ("Shampoo/Haircut (no style)", 25.0,  "#06B6D4", false, [],                                                                                                                                                                                         null),
      ("Shampoo/Haircut/Style",      38.0,  "#3B82F6", false, [],                                                                                                                                                                                         null),
      ("Men's Haircut",              25.0,  "#10B981", false, [],                                                                                                                                                                                         null),
      ("Beard Trim",                 10.0,  "#F59E0B", false, [],                                                                                                                                                                                         null),
      ("Perm",                       65.0,  "#EC4899", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Finish"; durationMinutes=30; phaseType=#active}],         ?("Finish")),
      ("Perm/Style",                 75.0,  "#F97316", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Style"; durationMinutes=30; phaseType=#active}],          ?("Style")),
      ("Perm/Haircut/Style",         85.0,  "#EF4444", true,  [{phaseLabel="Base"; durationMinutes=45; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Haircut/Style"; durationMinutes=30; phaseType=#active}], ?("Haircut/Style")),
      ("Color",                      60.0,  "#A855F7", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Finish"; durationMinutes=15; phaseType=#active}],         ?("Finish")),
      ("Color/Style",                70.0,  "#14B8A6", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Style"; durationMinutes=30; phaseType=#active}],          ?("Style")),
      ("Color/Haircut/Style",        80.0,  "#F43F5E", true,  [{phaseLabel="Base"; durationMinutes=30; phaseType=#active}, {phaseLabel="Processing"; durationMinutes=30; phaseType=#processing}, {phaseLabel="Haircut/Style"; durationMinutes=30; phaseType=#active}], ?("Haircut/Style")),
      ("Facial Waxing",              10.0,  "#D97706", false, [],                                                                                                                                                                                         null),
    ];

    var idx = 0;
    for ((name, price, colorHex, isMultiPhase, phases, finishingLabel) in defaults.values()) {
      let id = "svc-default-" # idx.toText();
      let svc : Types.Service = { id; name; price; colorHex; isMultiPhase; phases; finishingLabel };
      store.add(id, svc);
      idx += 1;
    };
  };
};
