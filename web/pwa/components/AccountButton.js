import React from "react";
import omit from "lodash/omit";
import Button from "@material-ui/core/Button";
import { useStoreSyncedWithLocalStorage } from "common/utils/store";
import { formatPersonName } from "common/utils/coworkers";
import makeStyles from "@material-ui/core/styles/makeStyles";
import Box from "@material-ui/core/Box";
import { NavigationMenu } from "../../common/Header";
import IconButton from "@material-ui/core/IconButton";
import ChevronLeftIcon from "@material-ui/icons/ChevronLeft";
import { MobilicLogoFilledIcon } from "common/utils/icons";
import Marianne from "common/assets/images/marianne-small.svg";

const useStyles = makeStyles(theme => ({
  container: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  button: {
    marginLeft: theme.spacing(1),
    color: darkBackground =>
      darkBackground
        ? theme.palette.primary.contrastText
        : theme.palette.primary.main,
    borderColor: darkBackground =>
      darkBackground
        ? theme.palette.primary.contrastText
        : theme.palette.primary.main
  }
}));

export function AccountButton(props) {
  const store = useStoreSyncedWithLocalStorage();

  const [openNavDrawer, setOpenNavDrawer] = React.useState(false);

  const classes = useStyles(props.darkBackground || false);

  const mergedProps = {
    ...omit(props, ["darkBackground"]),
    className: `${classes.container} ${props.className}`
  };

  return (
    <Box {...mergedProps}>
      {props.onBackButtonClick ? (
        <IconButton
          onClick={props.onBackButtonClick}
          className={`${classes.button} no-margin-no-padding`}
        >
          <ChevronLeftIcon />
        </IconButton>
      ) : (
        <img
          alt="marianne"
          src={Marianne}
          style={{ flexShrink: 1 }}
          width={48}
        />
      )}
      <Button
        style={{ textTransform: "capitalize" }}
        startIcon={<MobilicLogoFilledIcon />}
        variant="outlined"
        className={classes.button}
        disableElevation
        onClick={e => setOpenNavDrawer(!openNavDrawer)}
      >
        {formatPersonName(store.userInfo())}
      </Button>
      <NavigationMenu open={openNavDrawer} setOpen={setOpenNavDrawer} />
    </Box>
  );
}
