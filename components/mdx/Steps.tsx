import React from 'react';

interface StepsProps {
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return (
    <div className="steps-container my-8 ml-4 border-l-2 border-slate-200 dark:border-slate-700 pl-6 [counter-reset:step]">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === 'h3') {
          return (
            <div className="step relative [counter-increment:step] before:absolute before:-left-[34px] before:flex before:h-7 before:w-7 before:items-center before:justify-center before:rounded-full before:bg-slate-100 before:dark:bg-slate-800 before:text-sm before:font-medium before:text-slate-700 before:dark:text-slate-300 before:content-[counter(step)]">
              {child}
            </div>
          );
        }
        return child;
      })}
    </div>
  );
}
