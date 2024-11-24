// src/components/CompanyInput.tsx
'use client';

import { useState, useCallback } from 'react';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface CompanyInputProps {
  companies: string[];
  onChange: (companies: string[]) => void;
  disabled?: boolean;
}

export default function CompanyInput({ companies, onChange, disabled = false }: CompanyInputProps) {
  const [inputValue, setInputValue] = useState('');
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    setInputValue(prev => prev + pasteData);
  };

  const handleAdd = useCallback(() => {
    if (!inputValue.trim()) {
      toast({
        variant: "destructive",
        title: "错误",
        description: "请输入公司名称",
      });
      return;
    }
    
    const newCompanies = inputValue
      .split('\n')
      .map(company => company.trim())
      .filter(company => company && !companies.includes(company));
    
    if (newCompanies.length === 0) {
      toast({
        variant: "destructive",
        title: "提示",
        description: "没有新的公司需要添加",
      });
      return;
    }

    onChange([...companies, ...newCompanies]);
    setInputValue('');
    
    toast({
      title: "添加成功",
      description: `已添加 ${newCompanies.length} 个公司`,
    });
  }, [inputValue, companies, onChange, toast]);

  const handleRemove = useCallback((companyToRemove: string) => {
    onChange(companies.filter(company => company !== companyToRemove));
    toast({
      title: "已删除",
      description: `已移除 ${companyToRemove}`,
    });
  }, [companies, onChange, toast]);

  const handleClear = useCallback(() => {
    onChange([]);
    setInputValue('');
    toast({
      title: "已清空",
      description: "已清空所有公司",
    });
  }, [onChange, toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">输入公司名称</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={5}
            className="w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={inputValue}
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder="请输入或粘贴公司名称，每行一个公司"
            disabled={disabled}
          />
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={disabled}
            >
              清空
            </Button>
            <Button onClick={handleAdd} disabled={disabled}>
              添加
            </Button>
          </div>
        </CardContent>
      </Card>

      {companies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              已添加的公司 ({companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {companies.map((company, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted px-4 py-2"
                >
                  <span className="text-sm">{company}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(company)}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={disabled}
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}