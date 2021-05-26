import SvgIcon from "@material-ui/core/SvgIcon";
import React from "react";
import omit from "lodash/omit";
import { ReactComponent as PersonIcon_ } from "../assets/images/User.svg";
import { ReactComponent as TeamIcon_ } from "../assets/images/Team.svg";
import { ReactComponent as TruckIcon_ } from "../assets/images/Truck2.svg";
import { ReactComponent as HammerWenchIcon_ } from "../assets/images/Work.svg";
import { ReactComponent as BedIcon_ } from "../assets/images/Bed2.svg";
import { ReactComponent as FranceConnectIcon_ } from "../assets/images/FranceConnect.svg";
import { ReactComponent as FabNumIcon_ } from "../assets/images/fabnum.svg";
import { ReactComponent as MarianneIcon_ } from "common/assets/images/marianne.svg";
import _ManagerImage from "../assets/images/Manager.svg";
import _WorkerImage from "../assets/images/worker.svg";
import _SoftwareImage from "../assets/images/software.svg";
import _NoDataImage from "../assets/images/no-data.png";

export function PersonIcon(props) {
  return (
    <SvgIcon
      titleAccess="solo"
      {...props}
      viewBox="0 0 64 64"
      component={PersonIcon_}
    />
  );
}

export function TeamIcon(props) {
  return (
    <SvgIcon
      titleAccess="équipe"
      {...props}
      viewBox="0 0 64 64"
      component={TeamIcon_}
    />
  );
}

export function TruckIcon(props) {
  return (
    <SvgIcon
      titleAccess="déplacement"
      {...props}
      viewBox="0 0 246.14 157.79"
      component={TruckIcon_}
    />
  );
}

export function WorkIcon(props) {
  return (
    <SvgIcon
      titleAccess="autre tâche"
      {...props}
      viewBox="0 0 189.57 153.6"
      component={HammerWenchIcon_}
    />
  );
}

export function RestIcon(props) {
  return (
    <SvgIcon
      titleAccess="pause"
      {...props}
      viewBox="0 0 166.12 185.92"
      component={BedIcon_}
    />
  );
}

export function MarianneIcon(props) {
  return (
    <SvgIcon
      titleAccess="marianne"
      {...props}
      viewBox="40 40 210 200"
      component={MarianneIcon_}
    />
  );
}

export function NoDataImage(props) {
  return <img alt="pas de données" src={_NoDataImage} {...props} />;
}

export function ManagerImage(props) {
  return <img alt="gestionnaire" src={_ManagerImage} {...props} />;
}

export function WorkerImage(props) {
  return <img alt="salarié" src={_WorkerImage} {...props} />;
}

export function SoftwareImage(props) {
  return <img alt="logiciel" src={_SoftwareImage} {...props} />;
}

export function FranceConnectIcon(props) {
  return (
    <SvgIcon
      titleAccess="FranceConnect"
      style={{
        width: 283 * (props.scale ? props.scale : 1),
        height: 82 * (props.scale ? props.scale : 1),
        ...props.style
      }}
      {...omit(props, "style")}
      viewBox="0 0 283.5 82.2"
      component={FranceConnectIcon_}
    />
  );
}

export function FabNumIcon(props) {
  return (
    <SvgIcon
      titleAccess="fabrique numérique"
      style={{
        width: 141 * (props.scale ? props.scale : 1),
        height: 141 * (props.scale ? props.scale : 1),
        ...props.style
      }}
      {...omit(props, "style")}
      viewBox="0 0 141.73 141.73"
      component={FabNumIcon_}
    />
  );
}
