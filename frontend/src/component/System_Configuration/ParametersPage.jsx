import React from "react";
import { Container, Card, Spinner, Alert } from "react-bootstrap";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";
import {
  ParameterHeader,
  ParameterGrid,
  ParameterNote,
} from "./ParameterComponents";
import { useParametersLogic } from "./useParametersLogic";

export default function ParametersPage() {
  const {
    values,
    batches,
    loading,
    isLocked,
    checkingStatus,
    statusMsg,
    shutdownBusy,
    latestBatch,
    selectedBatchExists,
    newBatchBlocked,
    setStatusMsg,
    setField,
    onReset,
    onSave,
    onSequentialShutdown,
  } = useParametersLogic();

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" variant="success" />
      </div>
    );
  }

  return (
    <div
      className="d-flex"
      style={{ background: "#f5f7fb", minHeight: "100vh" }}
    >
      <SideBar />

      <div className="flex-grow-1">
        <DashboardHeader title="Environment Control" />

        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          {statusMsg.text && (
            <Alert
              variant={statusMsg.type}
              dismissible
              onClose={() => setStatusMsg({ type: "", text: "" })}
            >
              {statusMsg.text}
            </Alert>
          )}

          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <ParameterHeader
                onReset={onReset}
                onSave={onSave}
                onSequentialShutdown={onSequentialShutdown}
                isLocked={isLocked}
                checkingStatus={checkingStatus}
                shutdownBusy={shutdownBusy}
              />

              <ParameterGrid
                values={values}
                setField={setField}
                isLocked={isLocked}
                existingBatches={batches}
                latestBatch={latestBatch}
                newBatchBlocked={newBatchBlocked}
                selectedBatchExists={selectedBatchExists}
              />

              <ParameterNote isLocked={isLocked} />
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}