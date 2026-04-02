import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const steps = [
  { key: 'draft', label: 'Request' },
  { key: 'uploaded', label: 'Documents' },
  { key: 'extracted', label: 'Extract' },
  { key: 'reviewed', label: 'Review' },
  { key: 'pending_approval', label: 'Approval' },
  { key: 'approved', label: 'Approved' },
  { key: 'released', label: 'Released' }
];

export const WorkflowStepper = ({ currentStatus }) => {
  const currentStepIndex = steps.findIndex(s => s.key === currentStatus);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              {index <= currentStepIndex ? (
                <CheckCircle2 className="w-8 h-8 text-green-600 mb-2" />
              ) : (
                <Circle className="w-8 h-8 text-slate-300 mb-2" />
              )}
              <span className={`text-xs font-medium ${
                index <= currentStepIndex ? 'text-primary-800' : 'text-slate-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-2 mb-6 ${
                index < currentStepIndex ? 'bg-green-600' : 'bg-slate-300'
              }`}></div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default WorkflowStepper;
