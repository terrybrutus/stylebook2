import Types "types/common";
import AppointmentLib "lib/appointments";
import ServiceLib "lib/services";
import AppointmentsMixin "mixins/appointments-api";
import ServicesMixin "mixins/services-api";
import SettingsMixin "mixins/settings-api";

actor {
  // Stable state — initial values provided by migration chain
  let appointments : AppointmentLib.AppointmentMap;
  let services : ServiceLib.ServiceMap;
  let settings : Types.Settings;
  let state : { var nextAppointmentId : Nat; var nextServiceId : Nat; var servicesSeeded : Bool };

  // Compose mixins — all public API lives here via mixin delegation
  include AppointmentsMixin(appointments, state);
  include ServicesMixin(services, state);
  include SettingsMixin(settings);
};

