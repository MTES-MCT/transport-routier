import React from 'react';
import './App.css';
import BottomNavBar from "./components/BottomNavBar";
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import MoreIcon from '@material-ui/icons/MoreVert';
import {computeTotalActivityDurations} from "./utils/metrics";
import {CurrentActivity} from "./screens/CurrentActivity";
import {ACTIVITIES} from "./utils/activities";
import {BeforeWork} from "./screens/BeforeWork";
import {TeamSelectionModal} from "./components/TeamSelection";
import {SelectFirstActivityModal} from "./components/FirstActivitySelection";
import {currentTeamMates} from "./utils/coworkers";
import {groupEventsByDay} from "./utils/events";



const NAV_SCREENS = [
    {
        name: "item1",
        text: "Test",
        renderIcon: (props) => <MenuIcon {...props} />
    },
    {
        name: "item2",
        text: "Test",
        renderIcon: (props) => <SearchIcon {...props} />
    },
    {
        name: "item3",
        text: "Test",
        renderIcon: (props) => <MoreIcon {...props} />
    }
];


function App() {
  const [currentTab, setCurrentTab] = React.useState("item1");
  const [activityEvents, setActivityEvents] = React.useState([]);
  const [currentDate, setCurrentDate] = React.useState(Date.now());
  const [coworkers, setCoworkers] = React.useState([]);
  const [openTeamSelectionModal, setOpenTeamSelectionModal] = React.useState(false);

  React.useEffect(
      () => {setInterval(() => setCurrentDate(Date.now()), 5000)}, []
  );

  const teamMates = currentTeamMates(coworkers);
  const eventsByDay = groupEventsByDay(activityEvents);
  const previousDaysEvents = eventsByDay.slice(0, eventsByDay.length - 1);
  const currentActivityName = activityEvents[activityEvents.length - 1] ? activityEvents[activityEvents.length - 1].activityName : ACTIVITIES.end.name;
  const [openFirstActivityModal, setOpenFirstActivityModal] = React.useState(false);


  function pushNewEvent (activityName) {
      if (activityName === currentActivityName) return;
      setActivityEvents([
          ...activityEvents,
          {
              activityName: activityName,
              date: Date.now(),
              team: teamMates
          }
      ]);
  }

  const clearTeam = () => {
    const newCoworkers = coworkers.slice();
    newCoworkers.forEach((coworker) => {
        coworker.isInCurrentTeam = false;
    });
    setCoworkers(newCoworkers);
  };

  return (
    <div className="App">
        {currentActivityName === ACTIVITIES.end.name ?
            <BeforeWork
                previousDaysEvents={previousDaysEvents}
                setOpenTeamSelectionModal={setOpenTeamSelectionModal}
                setOpenFirstActivityModal={setOpenFirstActivityModal}
                clearTeam={clearTeam}
            />
            :
            <CurrentActivity
                currentActivityName={currentActivityName}
                currentDayEvents={eventsByDay[eventsByDay.length - 1]}
                pushNewCurrentDayEvent={pushNewEvent}
                setOpenTeamSelectionModal={setOpenTeamSelectionModal}
                teamMates={teamMates}
            />
        }
        <TeamSelectionModal
            open={openTeamSelectionModal}
            handleBack={() => setOpenTeamSelectionModal(false)}
            handleContinue={() => {
                setOpenTeamSelectionModal(false);
                currentActivityName === ACTIVITIES.end.name && setOpenFirstActivityModal(true)}
            }
            coworkers={coworkers}
            setCoworkers={setCoworkers}
        />
        <SelectFirstActivityModal
            open={openFirstActivityModal}
            handleClose={() => setOpenFirstActivityModal(false)}
            handleItemClick={(activity) => pushNewEvent(activity)}
        />
        <BottomNavBar screens={NAV_SCREENS} currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}

export default App;
