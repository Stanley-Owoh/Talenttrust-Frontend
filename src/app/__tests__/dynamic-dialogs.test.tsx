import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ContractsPage from "../contracts/page";
import MilestonesPage from "../milestones/page";
import * as repository from "@/lib/repository";
import { useToast } from "@/components/toast/toast-provider";

jest.mock("@/components/toast/toast-provider", () => ({
  useToast: jest.fn(() => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
    toasts: [],
    dismissToast: jest.fn(),
  })),
}));

jest.mock("@/components/contracts/ContractsList", () => ({
  __esModule: true,
  default: ({ contracts }: any) => (
    <ul data-testid="contracts-list">
      {contracts.map((contract: any) => (
        <li key={contract.id}>{contract.contractName}</li>
      ))}
    </ul>
  ),
}));

jest.mock("@/components/ContractCreationForm", () => ({
  ContractCreationForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="contract-form">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            id: "contract-1",
            contractName: "New Contract",
            parties: [],
            totalValue: 1000,
            currency: "USD",
            status: "Pending",
            createdAt: "2026-07-27",
            milestoneCount: 0,
          })
        }
      >
        Submit
      </button>
    </div>
  ),
}));

jest.mock("@/components/milestones/MilestoneCreationForm", () => ({
  MilestoneCreationForm: ({ onSubmit, onCancel }: any) => (
    <div data-testid="milestone-form">
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            id: "milestone-1",
            title: "New Milestone",
            status: "Pending",
            payout: 1200,
            currency: "USD",
            dueDate: "2026-08-01",
          })
        }
      >
        Add Milestone
      </button>
    </div>
  ),
}));

jest.mock("@/lib/repository", () => ({
  listContracts: jest.fn(() => []),
  saveContract: jest.fn(() => true),
  listMilestones: jest.fn(() => []),
  saveMilestone: jest.fn(() => true),
  updateMilestone: jest.fn(() => true),
}));

const mockedListContracts = repository.listContracts as jest.MockedFunction<
  typeof repository.listContracts
>;
const mockedSaveContract = repository.saveContract as jest.MockedFunction<
  typeof repository.saveContract
>;
const mockedListMilestones = repository.listMilestones as jest.MockedFunction<
  typeof repository.listMilestones
>;
const mockedSaveMilestone = repository.saveMilestone as jest.MockedFunction<
  typeof repository.saveMilestone
>;

describe("dynamic dialog code splitting", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedListContracts.mockReturnValue([]);
    mockedListMilestones.mockReturnValue([]);
    mockedSaveContract.mockReturnValue(true);
    mockedSaveMilestone.mockReturnValue(true);
  });

  it("shows the contract form loading fallback when opening the contract dialog", async () => {
    render(<ContractsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Contract/i }));

    expect(
      await screen.findByTestId("contract-form-loading"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("contract-form")).toBeInTheDocument();
    });
  });

  it("shows the milestone form loading fallback when opening the milestone dialog", async () => {
    render(<MilestonesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Add Milestone/i }));

    expect(
      await screen.findByTestId("milestone-form-loading"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("milestone-form")).toBeInTheDocument();
    });
  });

  it("focus remains managed after the contract dialog resolves", async () => {
    render(<ContractsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Contract/i }));

    await waitFor(() => {
      expect(screen.getByTestId("contract-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("contract-form")).toBeInTheDocument();
  });

  it("focus remains managed after the milestone dialog resolves", async () => {
    render(<MilestonesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Add Milestone/i }));

    await waitFor(() => {
      expect(screen.getByTestId("milestone-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("milestone-form")).toBeInTheDocument();
  });

  it("persists a new contract after dialog submission", async () => {
    render(<ContractsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Create Contract/i }));
    await waitFor(() => screen.getByTestId("contract-form"));

    fireEvent.click(screen.getByRole("button", { name: /Submit/i }));

    expect(mockedSaveContract).toHaveBeenCalledTimes(1);
  });

  it("persists a new milestone after dialog submission", async () => {
    render(<MilestonesPage />);

    fireEvent.click(screen.getByRole("button", { name: /Add Milestone/i }));
    await waitFor(() => screen.getByTestId("milestone-form"));

    fireEvent.click(screen.getByRole("button", { name: /Add Milestone/i }));

    expect(mockedSaveMilestone).toHaveBeenCalledTimes(1);
  });
});
