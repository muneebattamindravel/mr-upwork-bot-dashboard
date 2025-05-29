// uiTemplate.jsx
'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LoadingButton from '@/components/ui/loading-button';
import { PlusCircle, Save, Trash2 } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

const TemplateModule = () => {
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    // Simulate API action
    setTimeout(() => setLoading(false), 1500);
  };

  return (
    <div className="p-4 max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">[Your Module Title]</h1>

      {/* Input Field with Label */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Some Input</label>
        <Input
          className="input-field"
          placeholder="Enter value"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
      </div>

      {/* Select Dropdown */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Select Option</label>
        <Select onValueChange={setSelectedOption} value={selectedOption}>
          <SelectTrigger className="select-trigger">
            <SelectValue placeholder="Choose..." />
          </SelectTrigger>
          <SelectContent className="select-content">
            <SelectItem value="option1" className="select-item">Option 1</SelectItem>
            <SelectItem value="option2" className="select-item">Option 2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Button */}
      <LoadingButton onClick={handleAction} loading={loading} icon={<PlusCircle className="w-4 h-4" />}>
        Perform Action
      </LoadingButton>

      {/* Alert Dialog */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="btn-danger flex items-center gap-1">
            <Trash2 className="w-4 h-4" />
            Delete Item
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="btn-outline">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {}} className="btn-danger">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TemplateModule;
