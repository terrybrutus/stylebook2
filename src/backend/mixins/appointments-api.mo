import Types "../types/common";
import AppointmentLib "../lib/appointments";
import Nat "mo:core/Nat";

mixin (
  appointments : AppointmentLib.AppointmentMap,
  state : { var nextAppointmentId : Nat },
) {
  // Create a new appointment
  public func createAppointment(
    input : Types.CreateAppointmentInput
  ) : async Types.Appointment {
    let id = "appt-" # state.nextAppointmentId.toText();
    state.nextAppointmentId += 1;
    AppointmentLib.create(appointments, input, id);
  };

  // Get all appointments
  public query func getAppointments() : async [Types.Appointment] {
    AppointmentLib.getAll(appointments);
  };

  // Get appointment by id
  public query func getAppointment(id : Types.Id) : async ?Types.Appointment {
    AppointmentLib.getById(appointments, id);
  };

  // Update an existing appointment
  public func updateAppointment(
    input : Types.UpdateAppointmentInput
  ) : async ?Types.Appointment {
    AppointmentLib.update(appointments, input);
  };

  // Delete an appointment
  public func deleteAppointment(id : Types.Id) : async Bool {
    AppointmentLib.delete(appointments, id);
  };

  // Query appointments within a date range (inclusive)
  public query func getAppointmentsByDateRange(
    startDate : Types.ISODate,
    endDate : Types.ISODate,
  ) : async [Types.Appointment] {
    AppointmentLib.getByDateRange(appointments, startDate, endDate);
  };

  // Query all appointments for a specific client
  public query func getAppointmentsByClient(
    clientName : Text
  ) : async [Types.Appointment] {
    AppointmentLib.getByClientName(appointments, clientName);
  };

  // Get all unique client names for autocomplete
  public query func getClientNames() : async [Text] {
    AppointmentLib.getAllClientNames(appointments);
  };
};
