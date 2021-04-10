import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";

const ModalContext = React.createContext(() => {});

export class ModalProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    Object.keys(props.modalDict).forEach(modalName => {
      this.state[modalName] = { open: false, modalProps: {} };
    });
    this.interface = {
      open: this.open,
      close: this.close,
      closeAll: this.closeAll
    };
  }

  open = (modalName, modalProps = {}, updateProps = () => {}) => {
    this.setState(prevState => {
      return {
        [modalName]: {
          open: true,
          modalProps: {
            ...modalProps,
            ...updateProps(prevState[modalName].modalProps)
          }
        }
      };
    });
  };

  close = modalName =>
    new Promise(resolve => {
      this.setState(
        {
          [modalName]: { open: false, modalProps: {} }
        },
        resolve
      );
    });

  closeAll = () =>
    new Promise(resolve => {
      this.setState(
        prevState =>
          Object.fromEntries(
            Object.keys(this.state).map(modalName => [
              modalName,
              { open: false, modalProps: {} }
            ])
          ),
        resolve
      );
    });

  render() {
    return (
      <ModalContext.Provider value={this.interface}>
        {this.props.children}
        <React.Suspense fallback={<CircularProgress color="primary" />}>
          {Object.keys(this.props.modalDict)
            .filter(modalName => this.state[modalName].open)
            .map((modalName, index) => {
              const Modal = this.props.modalDict[modalName];
              return (
                <Modal
                  key={index}
                  open={!!this.state[modalName].open}
                  handleClose={() => this.close(modalName)}
                  {...this.state[modalName].modalProps}
                />
              );
            })}
        </React.Suspense>
      </ModalContext.Provider>
    );
  }
}

export const useModals = () => React.useContext(ModalContext);
