import React, { useRef, useState, useEffect, useMemo } from 'react';
import { View, PanResponder, LayoutChangeEvent } from 'react-native';

interface RangeSliderProps {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
  onValuesChange: (min: number, max: number) => void;
}

export const RangeSlider = ({ min, max, currentMin, currentMax, onValuesChange }: RangeSliderProps) => {
  const [width, setWidth] = useState(0);

  // Track values locally for instant UI update while dragging
  const [localMin, setLocalMin] = useState(currentMin);
  const [localMax, setLocalMax] = useState(currentMax);

  // Sync with external state changes (e.g. text inputs being typed into)
  useEffect(() => {
    setLocalMin(currentMin);
    setLocalMax(currentMax);
  }, [currentMin, currentMax]);

  // We use a ref to reliably access current values inside PanResponder callbacks
  const stateRef = useRef({ localMin, localMax, width, min, max });
  stateRef.current = { localMin, localMax, width, min, max };

  const getPercentage = (value: number) => {
    if (max === min) return 0;
    const clamped = Math.max(min, Math.min(value, max));
    return ((clamped - min) / (max - min)) * 100;
  };

  const leftPanResponder = useMemo(() => {
    let startVal = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal = stateRef.current.localMin;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { width, max, min, localMax } = stateRef.current;
        if (width === 0) return;
        const deltaVal = (gestureState.dx / width) * (max - min);
        let newVal = Math.round(startVal + deltaVal);
        newVal = Math.max(min, Math.min(newVal, localMax));
        setLocalMin(newVal);
      },
      onPanResponderRelease: () => {
        onValuesChange(stateRef.current.localMin, stateRef.current.localMax);
      }
    });
  }, [onValuesChange]);

  const rightPanResponder = useMemo(() => {
    let startVal = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVal = stateRef.current.localMax;
      },
      onPanResponderMove: (evt, gestureState) => {
        const { width, max, min, localMin } = stateRef.current;
        if (width === 0) return;
        const deltaVal = (gestureState.dx / width) * (max - min);
        let newVal = Math.round(startVal + deltaVal);
        newVal = Math.max(localMin, Math.min(newVal, max));
        setLocalMax(newVal);
      },
      onPanResponderRelease: () => {
        onValuesChange(stateRef.current.localMin, stateRef.current.localMax);
      }
    });
  }, [onValuesChange]);

  const leftPos = getPercentage(localMin);
  const rightPos = getPercentage(localMax);

  return (
    <View 
      className="h-10 justify-center w-full relative"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      {/* Background track */}
      <View 
        className="bg-slate-200 dark:bg-slate-700 rounded-full w-full absolute"
        style={{ height: 6, top: '50%', marginTop: -3 }}
      />
      
      {/* Active track */}
      <View 
        className="bg-[#2563eb] rounded-full absolute"
        style={{ height: 6, left: `${leftPos}%`, width: `${rightPos - leftPos}%`, top: '50%', marginTop: -3 }}
      />
      
      {/* Left thumb */}
      <View 
        className="absolute w-12 h-12 justify-center items-center"
        style={{ left: `${leftPos}%`, marginLeft: -24, top: '50%', marginTop: -24 }}
        {...leftPanResponder.panHandlers}
      >
        <View className="w-[18px] h-[18px] rounded-full bg-[#2563eb] border-2 border-white shadow-sm" />
      </View>
      
      {/* Right thumb */}
      <View 
        className="absolute w-12 h-12 justify-center items-center"
        style={{ left: `${rightPos}%`, marginLeft: -24, top: '50%', marginTop: -24 }}
        {...rightPanResponder.panHandlers}
      >
        <View className="w-[18px] h-[18px] rounded-full bg-[#2563eb] border-2 border-white shadow-sm" />
      </View>
    </View>
  );
};
