import React from "react";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import IconButton from "@material-ui/core/IconButton";
import DialogContent from "@material-ui/core/DialogContent";
import { formatTimeOfDay, now } from "common/utils/time";
import { getTime } from "common/utils/events";
import { DateOrDateTimePicker } from "./DateOrDateTimePicker";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import { VehicleInput } from "./VehicleInput";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import { resolveVehicle } from "common/utils/vehicles";

export default function VehicleBookingModal({
  open,
  currentVehicleBooking,
  handleClose,
  handleContinue
}) {
  const store = useStoreSyncedWithLocalStorage();

  const [vehicle, setVehicle] = React.useState("");
  const [bookingTime, setBookingTime] = React.useState(undefined);
  const [bookingTimeError, setBookingTimeError] = React.useState("");

  const currentVehicle = resolveVehicle(currentVehicleBooking, store);

  React.useEffect(() => {
    setBookingTime(now());
    setVehicle(null);
  }, [open]);

  return (
    <Dialog onClose={handleClose} open={open} fullWidth>
      <DialogTitle disableTypography>
        <Typography variant="h4">Nouveau véhicule</Typography>
      </DialogTitle>
      <DialogContent>
        {currentVehicle && (
          <Box my={2}>
            <Typography>
              Véhicule actuel : {currentVehicleBooking.vehicleName}
            </Typography>
            <Typography>
              Occupé depuis {formatTimeOfDay(getTime(currentVehicleBooking))}
            </Typography>
          </Box>
        )}
        <Box my={2}>
          <VehicleInput
            label="Nouveau véhicule"
            vehicle={vehicle}
            setVehicle={setVehicle}
          />
          <Box mb={1} />
          <DateOrDateTimePicker
            label="Heure de début"
            time={bookingTime}
            setTime={setBookingTime}
            error={bookingTimeError}
            setError={setBookingTimeError}
            minTime={
              currentVehicleBooking ? getTime(currentVehicleBooking) : null
            }
            maxTime={now()}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <IconButton onClick={handleClose}>
          <CloseIcon color="error" />
        </IconButton>
        <IconButton
          onClick={() => {
            handleContinue(vehicle, bookingTime);
            handleClose();
          }}
          disabled={
            !vehicle ||
            (!vehicle.id && !vehicle.registrationNumber) ||
            bookingTimeError ||
            false
          }
        >
          <CheckIcon color="primary" />
        </IconButton>
      </DialogActions>
    </Dialog>
  );
}
