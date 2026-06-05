import Types "../types/common";
import ServiceLib "../lib/services";
import Nat "mo:core/Nat";

mixin (
  services : ServiceLib.ServiceMap,
  state : { var nextServiceId : Nat },
) {
  // Create a new service
  public func createService(
    input : Types.CreateServiceInput
  ) : async Types.Service {
    let id = "svc-" # state.nextServiceId.toText();
    state.nextServiceId += 1;
    ServiceLib.create(services, input, id);
  };

  // Get all services
  public query func getServices() : async [Types.Service] {
    ServiceLib.getAll(services);
  };

  // Update an existing service
  public func updateService(
    input : Types.UpdateServiceInput
  ) : async ?Types.Service {
    ServiceLib.update(services, input);
  };

  // Delete a service
  public func deleteService(id : Types.Id) : async Bool {
    ServiceLib.delete(services, id);
  };
};
