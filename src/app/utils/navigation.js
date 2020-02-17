import { ACTIVITIES } from "../../common/utils/activities";
import { BeforeWork } from "../screens/BeforeWork";
import { CurrentActivity } from "../screens/CurrentActivity";
import React from "react";
import TimerIcon from "@material-ui/icons/Timer";
import TimelineIcon from "@material-ui/icons/Timeline";
import InfoIcon from "@material-ui/icons/Info";
import { PlaceHolder } from "../../common/components/PlaceHolder";
import BottomNavBar from "../components/BottomNavBar";
import { History } from "../screens/History";
import Typography from "@material-ui/core/Typography";
import { DailyContext } from "../screens/DailyContext";

const SCREENS_WITH_BOTTOM_NAVIGATION = {
  activity: {
    name: "activity",
    label: "Activité",
    renderIcon: props => <TimerIcon {...props} />,
    render: props =>
      props.currentActivity &&
      props.currentActivity.type !== ACTIVITIES.rest.name ? (
        <CurrentActivity {...props} />
      ) : (
        <BeforeWork {...props} />
      )
  },
  context: {
    name: "context",
    label: "Infos",
    renderIcon: props => <InfoIcon {...props} />,
    render: props => <DailyContext {...props} />
  },
  history: {
    name: "history",
    label: "Historique",
    renderIcon: props => <TimelineIcon {...props} />,
    render: props =>
      props.previousDaysEventsByDay.length > 0 ? (
        <History {...props} />
      ) : (
        <PlaceHolder>
          <Typography variant="h4">😅</Typography>
          <Typography style={{ fontWeight: "bold" }}>
            Vous n'avez pas encore d'historique !
          </Typography>
        </PlaceHolder>
      )
  }
};

export function ScreenWithBottomNavigation(props) {
  const [screen, setScreen] = React.useState(
    SCREENS_WITH_BOTTOM_NAVIGATION.activity.name
  );
  return [
    SCREENS_WITH_BOTTOM_NAVIGATION[screen].render({ key: 1, ...props }),
    <BottomNavBar
      key={2}
      screens={SCREENS_WITH_BOTTOM_NAVIGATION}
      currentScreen={screen}
      setCurrentScreen={setScreen}
    />
  ];
}