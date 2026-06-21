import { useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { Button } from '../../Button';
import type { Question } from './types';
import { QUESTION_KEY_PREFIX } from './constants';

interface QuestionFormProps {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

export function QuestionForm({ questions, onSubmit, onCancel }: QuestionFormProps) {
  const [selected, setSelected] = useState<Record<number, string[]>>({});
  const [otherText, setOtherText] = useState<Record<number, string>>({});
  const [otherSelected, setOtherSelected] = useState<Record<number, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const question = questions[0];
  const qIndex = 0;

  const currentSelected = selected[qIndex] || [];
  const currentOtherText = otherText[qIndex] || '';
  const isOther = otherSelected[qIndex] || false;

  const handleSelect = (label: string) => {
    if (question.multiSelect) {
      const current = currentSelected;
      if (current.includes(label)) {
        setSelected(prev => ({ ...prev, [qIndex]: current.filter(l => l !== label) }));
      } else {
        setSelected(prev => ({ ...prev, [qIndex]: [...current, label] }));
      }
    } else {
      setSelected(prev => ({ ...prev, [qIndex]: [label] }));
      setOtherSelected(prev => ({ ...prev, [qIndex]: false }));
      setOtherText(prev => ({ ...prev, [qIndex]: '' }));
    }
  };

  const handleOtherToggle = () => {
    if (isOther) {
      setOtherSelected(prev => ({ ...prev, [qIndex]: false }));
      setOtherText(prev => ({ ...prev, [qIndex]: '' }));
    } else {
      setOtherSelected(prev => ({ ...prev, [qIndex]: true }));
      setSelected(prev => ({ ...prev, [qIndex]: [] }));
    }
  };

  const handleOtherTextChange = (text: string) => {
    setOtherText(prev => ({ ...prev, [qIndex]: text }));
  };

  const isAnswered = currentSelected.length > 0 || (isOther && currentOtherText.trim().length > 0);

  const handleSubmit = () => {
    setIsSubmitting(true);
    let answer = '';
    if (isOther && currentOtherText.trim()) {
      answer = currentOtherText.trim();
    } else {
      answer = currentSelected.join(', ');
    }
    onSubmit({ [`${QUESTION_KEY_PREFIX}0`]: answer });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 pt-1">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{question.header}</div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{question.question}</p>
        </div>
      </div>

      <div className="flex flex-col gap-0.5">
        {question.options.map((option, optIdx) => {
          const isSelected = currentSelected.includes(option.label);
          return (
            <div
              key={optIdx}
              onClick={() => handleSelect(option.label)}
              className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 cursor-pointer transition-colors"
              style={{
                backgroundColor: isSelected ? 'var(--primary)' + '20' : 'transparent',
                border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
              }}
            >
              <div
                className="size-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border)' }}
              >
                {isSelected && <div className="size-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm" style={{ color: 'var(--foreground)' }}>{option.label}</div>
                {option.description && (
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>{option.description}</div>
                )}
              </div>
            </div>
          );
        })}

        <div
          onClick={handleOtherToggle}
          className="flex items-center gap-2.5 rounded-sm px-2.5 py-2 cursor-pointer transition-colors"
          style={{
            backgroundColor: isOther ? 'var(--primary)' + '20' : 'transparent',
            border: isOther ? '1px solid var(--primary)' : '1px solid transparent',
          }}
        >
          <div
            className="size-4 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: isOther ? 'var(--primary)' : 'var(--border)' }}
          >
            {isOther && <div className="size-2 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm" style={{ color: 'var(--foreground)' }}>Something else</div>
            {isOther && (
              <input
                type="text"
                placeholder="Type your answer..."
                value={currentOtherText}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  handleOtherTextChange(e.target.value);
                }}
                className="mt-1 w-full h-8 px-2 rounded border text-sm"
                style={{ 
                  borderColor: 'var(--border)', 
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--foreground)'
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Skip
        </Button>
        <div className="flex-1" />
        <Button 
          size="sm" 
          onClick={handleSubmit}
          disabled={!isAnswered || isSubmitting}
        >
          {isSubmitting ? (
            <><Loader2 className="size-4 animate-spin" /> Submitting…</>
          ) : (
            <><CheckCircle className="size-4" /> Submit</>
          )}
        </Button>
      </div>
    </div>
  );
}